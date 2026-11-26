import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  buildWhatsAppUrl,
  ROOT_DIR,
  sanitizeExternalUrl,
  sanitizeWhatsAppDigits,
  SUPPORTED_LOCALES,
} from '../src/config/site.config.mjs';
import { buildSite } from '../scripts/build.mjs';

function collectKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      keys.push(`${fullKey}[len=${v.length}]`);
      v.forEach((item, idx) => {
        if (item && typeof item === 'object') {
          keys.push(...collectKeys(item, `${fullKey}[${idx}]`));
        }
      });
    } else if (v && typeof v === 'object') {
      keys.push(...collectKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

test('Security sanitizers block unsafe protocols and malformed phone numbers', () => {
  assert.equal(sanitizeExternalUrl('javascript:alert(1)', 'https://safe.example'), 'https://safe.example');
  assert.equal(sanitizeExternalUrl('http://insecure.example', 'https://safe.example'), 'https://safe.example');
  assert.equal(sanitizeExternalUrl('data:text/html,<script>', 'https://safe.example'), 'https://safe.example');
  assert.equal(
    sanitizeExternalUrl('https://www.instagram.com/karimacourses/'),
    'https://www.instagram.com/karimacourses/'
  );

  assert.equal(sanitizeWhatsAppDigits('+49 1745635761'), '491745635761');
  assert.equal(sanitizeWhatsAppDigits('invalid', '491745635761'), '491745635761');
  assert.equal(
    buildWhatsAppUrl('+49 1745635761', 'Hello & Welcome'),
    'https://wa.me/491745635761?text=Hello%20%26%20Welcome'
  );
});

test('All locale JSON files (en, de, id) have 100% matching key parity and zero forbidden copy', () => {
  const localesDir = path.join(ROOT_DIR, 'src', 'locales');
  const enData = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
  const enKeys = collectKeys(enData);

  for (const loc of SUPPORTED_LOCALES) {
    const raw = fs.readFileSync(path.join(localesDir, `${loc.code}.json`), 'utf8');
    assert.equal(/nadya/i.test(raw), false, `Locale ${loc.code} must not contain "Nadya"`);

    const parsed = JSON.parse(raw);
    assert.deepEqual(collectKeys(parsed), enKeys, `Locale ${loc.code} schema diverges from en.json`);
  }
});

test('Static build outputs valid, CSP-strict, GDPR-clean pages and all local assets exist', async () => {
  const { distDir } = await buildSite();

  // Verify core output files
  for (const requiredFile of [
    'index.html',
    'en/index.html',
    'de/index.html',
    'id/index.html',
    'robots.txt',
    'sitemap.xml',
    '_headers',
    'assets/css/main.css',
    'assets/js/bootstrap.bundle.min.js',
    'assets/js/main.js',
    'assets/js/redirect.js',
  ]) {
    const fullPath = path.join(distDir, requiredFile);
    assert.equal(fs.existsSync(fullPath), true, `Missing build artifact: ${requiredFile}`);
    assert.ok(fs.statSync(fullPath).size > 0, `Empty build artifact: ${requiredFile}`);
  }

  // Verify compiled CSS has no external CDN URLs or data:image/svg+xml (CSP img-src 'self')
  const mainCss = fs.readFileSync(path.join(distDir, 'assets', 'css', 'main.css'), 'utf8');
  assert.equal(/fonts\.googleapis\.com|cdn\.jsdelivr|cdnjs\.cloudflare|unpkg\.com/i.test(mainCss), false);
  assert.equal(/data:image\/svg\+xml/i.test(mainCss), false, 'CSS should not contain data:image/svg+xml URIs');

  // Verify every localized HTML page
  for (const page of ['index.html', 'en/index.html', 'de/index.html', 'id/index.html']) {
    const html = fs.readFileSync(path.join(distDir, page), 'utf8');

    // No Nadya reference, no temporary Figma URLs, no third-party CDNs
    assert.equal(/nadya/i.test(html), false, `${page} must not mention Nadya`);
    assert.equal(/figma\.com\/api\/mcp/i.test(html), false, `${page} contains temporary Figma asset URL`);
    assert.equal(
      /fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr|cdnjs\.cloudflare|unpkg\.com/i.test(html),
      false,
      `${page} must not call external CDNs (GDPR/DSGVO compliance)`
    );

    // Strict CSP checks: no inline <script> blocks and no inline style="..." attributes
    const scriptTags = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
    for (const tag of scriptTags) {
      assert.match(tag, /\bsrc="\/assets\/js\/[^"]+"/, `Inline script detected in ${page}: ${tag}`);
      assert.match(tag, /><\/script>$/, `Non-empty script body detected in ${page}`);
    }
    assert.equal(/\sstyle="/i.test(html), false, `Inline style attribute detected in ${page}`);

    // Every target="_blank" link must include rel="noopener noreferrer"
    const blankLinks = html.match(/<a\b[^>]*target="_blank"[^>]*>/gi) || [];
    for (const link of blankLinks) {
      assert.match(link, /rel="noopener noreferrer"/, `Missing rel="noopener noreferrer" in ${page}: ${link}`);
    }

    // Verify all referenced /assets/... files exist on disk and are non-empty
    const assetRefs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
    assert.ok(assetRefs.length > 0, `Expected local asset references in ${page}`);
    for (const ref of assetRefs) {
      const diskPath = path.join(distDir, ref.replace(/^\/+/, ''));
      assert.equal(fs.existsSync(diskPath), true, `Missing referenced asset ${ref} in ${page}`);
      assert.ok(fs.statSync(diskPath).size > 0, `Empty referenced asset ${ref} in ${page}`);
    }

    // Verify WhatsApp links use the configured number +491745635761
    if (page !== 'index.html') {
      const waMatches = html.match(/https:\/\/wa\.me\/491745635761\?text=/g) || [];
      assert.ok(waMatches.length >= 10, `Expected >= 10 WhatsApp CTA links in ${page}, got ${waMatches.length}`);
    }
  }
});
