import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '../..');

/**
 * Loads local .env file using Node.js 24 native process.loadEnvFile when present.
 * Existing process.env values (e.g. CI/CD or VPS environment variables) take precedence.
 */
export function loadLocalEnv(envPath = path.join(ROOT_DIR, '.env')) {
  if (!fs.existsSync(envPath)) return;
  const before = { ...process.env };
  process.loadEnvFile(envPath);
  // Restore any pre-existing environment variables so CI/hosting env vars always win
  for (const [key, value] of Object.entries(before)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
}

/**
 * Validates that an external URL strictly uses HTTPS protocol.
 * Protects against accidental javascript:, data:, or non-TLS URL injection.
 */
export function sanitizeExternalUrl(rawUrl, fallback = 'https://karimacourses.com') {
  const candidate = String(rawUrl ?? '').trim();
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') {
      throw new Error(`Disallowed protocol "${parsed.protocol}" for external URL`);
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
}

/**
 * Strips formatting characters and validates E.164 digit length (8-15 digits).
 */
export function sanitizeWhatsAppDigits(rawPhone, fallback = '491745635761') {
  const digits = String(rawPhone ?? '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return fallback;
  }
  return digits;
}

/**
 * Builds a strictly encoded WhatsApp Click-to-Chat URL (https://wa.me/...).
 */
export function buildWhatsAppUrl(phoneDigits, message = '') {
  const safeDigits = sanitizeWhatsAppDigits(phoneDigits);
  const trimmedMessage = String(message ?? '').trim();
  if (!trimmedMessage) {
    return `https://wa.me/${safeDigits}`;
  }
  return `https://wa.me/${safeDigits}?text=${encodeURIComponent(trimmedMessage)}`;
}

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'EN', name: 'English', htmlLang: 'en', ogLocale: 'en_US' },
  { code: 'de', label: 'DE', name: 'Deutsch', htmlLang: 'de', ogLocale: 'de_DE' },
  { code: 'id', label: 'ID', name: 'Bahasa Indonesia', htmlLang: 'id', ogLocale: 'id_ID' },
];

export const DEFAULT_LOCALE = 'en';

/**
 * Builds the runtime/build site configuration from environment variables.
 * Designed as a single source of truth shared between SSG build and any future Express SSR server.
 */
export function getSiteConfig() {
  loadLocalEnv();

  const siteEnv = process.env.SITE_ENV === 'production' ? 'production' : 'staging';
  const siteUrl = sanitizeExternalUrl(process.env.SITE_URL, 'https://karimacourses.com').replace(/\/+$/, '');
  const port = Number.parseInt(process.env.PORT ?? '3000', 10) || 3000;

  const waDisplay = String(process.env.WHATSAPP_NUMBER ?? '+49 1745635761').trim() || '+49 1745635761';
  const waDigits = sanitizeWhatsAppDigits(waDisplay, '491745635761');

  const instagramUrl = sanitizeExternalUrl(
    process.env.INSTAGRAM_URL,
    'https://www.instagram.com/karimacourses/'
  );
  const instagramHandle = String(process.env.INSTAGRAM_HANDLE ?? '@karimacourses').trim() || '@karimacourses';

  const superprofUrl = sanitizeExternalUrl(
    process.env.SUPERPROF_URL,
    'https://www.superprof.co.id/polyglot-dengan-pengalaman-tahun-berbahasajerman-level-native-menerima-kelas-untuk.html'
  );
  const linkedinUrl = sanitizeExternalUrl(
    process.env.LINKEDIN_URL,
    'https://www.linkedin.com/in/nediva-taufik-4ab734259/'
  );

  return {
    brand: {
      primary: 'KARIMA',
      secondary: 'COURSES',
      fullName: 'Karima Courses',
      year: 2026,
    },
    env: siteEnv,
    isProduction: siteEnv === 'production',
    siteUrl,
    port,
    defaultLocale: DEFAULT_LOCALE,
    locales: SUPPORTED_LOCALES,
    contact: {
      whatsappDisplay: waDisplay,
      whatsappDigits: waDigits,
      instagramUrl,
      instagramHandle,
      superprofUrl,
      linkedinUrl,
    },
    buildWhatsAppUrl: (message) => buildWhatsAppUrl(waDigits, message),
  };
}
