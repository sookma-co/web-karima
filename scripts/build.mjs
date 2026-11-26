import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import * as sass from 'sass';
import { getSiteConfig, ROOT_DIR } from '../src/config/site.config.mjs';

const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const NODE_MODULES_DIR = path.join(ROOT_DIR, 'node_modules');

const FONT_WEIGHTS = [400, 500, 600, 700, 800];
const FONT_SUBSETS = ['latin', 'latin-ext'];

export const STRICT_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

function readLocaleFile(localeCode) {
  const filePath = path.join(SRC_DIR, 'locales', `${localeCode}.json`);
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function buildWaLinks(site, waMessages) {
  const links = {};
  for (const [key, message] of Object.entries(waMessages)) {
    links[key] = site.buildWhatsAppUrl(message);
  }
  return links;
}

function compileStyles() {
  const cssOutDir = path.join(DIST_DIR, 'assets', 'css');
  fs.mkdirSync(cssOutDir, { recursive: true });

  const result = sass.compile(path.join(SRC_DIR, 'styles', 'main.scss'), {
    loadPaths: [NODE_MODULES_DIR, path.join(SRC_DIR, 'styles')],
    style: 'compressed',
    quietDeps: true,
    silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
  });

  fs.writeFileSync(path.join(cssOutDir, 'main.css'), result.css, 'utf8');
}

function copySelfHostedFonts() {
  const fontSrcDir = path.join(NODE_MODULES_DIR, '@fontsource', 'plus-jakarta-sans', 'files');
  const fontOutDir = path.join(DIST_DIR, 'assets', 'fonts');
  fs.mkdirSync(fontOutDir, { recursive: true });

  for (const subset of FONT_SUBSETS) {
    for (const weight of FONT_WEIGHTS) {
      const fileName = `plus-jakarta-sans-${subset}-${weight}-normal.woff2`;
      const srcFile = path.join(fontSrcDir, fileName);
      if (!fs.existsSync(srcFile)) {
        throw new Error(`Missing required self-hosted font file: ${srcFile}`);
      }
      fs.copyFileSync(srcFile, path.join(fontOutDir, fileName));
    }
  }
}

function copyScriptsAndAssets() {
  const jsOutDir = path.join(DIST_DIR, 'assets', 'js');
  fs.mkdirSync(jsOutDir, { recursive: true });

  fs.copyFileSync(
    path.join(NODE_MODULES_DIR, 'bootstrap', 'dist', 'js', 'bootstrap.bundle.min.js'),
    path.join(jsOutDir, 'bootstrap.bundle.min.js')
  );
  fs.copyFileSync(path.join(SRC_DIR, 'js', 'main.js'), path.join(jsOutDir, 'main.js'));
  fs.copyFileSync(path.join(SRC_DIR, 'js', 'redirect.js'), path.join(jsOutDir, 'redirect.js'));

  // Copy images, icons, illustrations
  for (const folder of ['images', 'icons', 'illustrations']) {
    const srcFolder = path.join(SRC_DIR, 'assets', folder);
    const outFolder = path.join(DIST_DIR, 'assets', folder);
    fs.cpSync(srcFolder, outFolder, { recursive: true });
  }
}

async function renderPages(site) {
  const layoutPath = path.join(SRC_DIR, 'views', 'layouts', 'base.ejs');
  const redirectPath = path.join(SRC_DIR, 'views', 'pages', 'redirect.ejs');

  // Render localized pages: /en/, /de/, /id/
  for (const localeMeta of site.locales) {
    const t = readLocaleFile(localeMeta.code);
    const waLinks = buildWaLinks(site, t.waMessages);
    const canonicalUrl = `${site.siteUrl}/${localeMeta.code}/`;

    const html = await ejs.renderFile(layoutPath, {
      site,
      localeMeta,
      t,
      waLinks,
      canonicalUrl,
    });

    const outDir = path.join(DIST_DIR, localeMeta.code);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  }

  // Render root redirect page: / -> /en/
  const redirectHtml = await ejs.renderFile(redirectPath, { site });
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), redirectHtml, 'utf8');
}

function generateMetadataFiles(site) {
  // robots.txt
  const robotsTxt = site.isProduction
    ? `User-agent: *\nAllow: /\n\nSitemap: ${site.siteUrl}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf8');

  // sitemap.xml
  const today = new Date().toISOString().slice(0, 10);
  const urlEntries = site.locales
    .map((loc) => {
      const alternates = site.locales
        .map(
          (alt) =>
            `    <xhtml:link rel="alternate" hreflang="${alt.code}" href="${site.siteUrl}/${alt.code}/" />`
        )
        .join('\n');
      return [
        '  <url>',
        `    <loc>${site.siteUrl}/${loc.code}/</loc>`,
        alternates,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${site.siteUrl}/${site.defaultLocale}/" />`,
        `    <lastmod>${today}</lastmod>`,
        '    <changefreq>weekly</changefreq>',
        `    <priority>${loc.code === site.defaultLocale ? '1.0' : '0.9'}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  const sitemapXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urlEntries,
    '</urlset>',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8');

  // _headers (Cloudflare Pages / Netlify security headers)
  const headersLines = [
    '/*',
    `  Content-Security-Policy: ${STRICT_CSP}; upgrade-insecure-requests`,
    '  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Cross-Origin-Resource-Policy: same-origin',
  ];

  if (!site.isProduction) {
    headersLines.push('  X-Robots-Tag: noindex, nofollow');
  }

  headersLines.push(
    '',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    ''
  );

  fs.writeFileSync(path.join(DIST_DIR, '_headers'), headersLines.join('\n'), 'utf8');
}

export async function buildSite() {
  const startTime = Date.now();
  const site = getSiteConfig();

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  compileStyles();
  copySelfHostedFonts();
  copyScriptsAndAssets();
  await renderPages(site);
  generateMetadataFiles(site);

  const elapsedMs = Date.now() - startTime;
  return { site, elapsedMs, distDir: DIST_DIR };
}

// Run directly when executed via `node scripts/build.mjs`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSite()
    .then(({ site, elapsedMs }) => {
      console.log(
        `[build] Karima Courses built in ${elapsedMs}ms (env=${site.env}, locales=${site.locales
          .map((l) => l.code)
          .join(',')})`
      );
    })
    .catch((err) => {
      console.error('[build] Failed:', err);
      process.exitCode = 1;
    });
}
