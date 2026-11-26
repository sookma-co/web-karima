# web-karima — Karima Courses Landing Page

Responsive, multi-language (**English, German, Indonesian**) landing page for **Karima Courses**, managed by Sookma Digital.

Built with **Node.js 24**, **Bootstrap 5.3 (SCSS)**, and **EJS templates** so it deploys today as a zero-backend static build (`dist/`) and can be upgraded directly to **Express SSR** without rewriting views, styles, or localization files.

---

## Tech Stack & Highlights

- **Runtime:** Node.js `>= 24.0.0` (ESM, native `process.loadEnvFile`, native `node:test`)
- **UI Framework:** Bootstrap 5.3 via npm + modular SCSS (`src/styles/`)
- **Templates:** Modular EJS partials (`src/views/partials/`) — one file per section
- **Multi-Language URLs:** `/en/` (default), `/de/`, `/id/` driven by `src/locales/*.json`
- **WhatsApp Click-to-Chat:** Centralized in `.env` + `src/config/site.config.mjs` with per-CTA, per-language pre-filled messages
- **GDPR / DSGVO & Security Ready:**
  - **100% self-hosted assets & fonts** (`@fontsource/plus-jakarta-sans`, Bootstrap 5.3, SVG/PNG icons, illustrations) — zero Google Fonts or external CDN requests
  - **Strict CSP** (`default-src 'self'`, zero inline `<script>`, zero inline `style=`, zero `data:image/svg+xml`)
  - **Staging protection:** `SITE_ENV=staging` automatically adds `noindex, nofollow` across HTML meta tags, `robots.txt`, and `_headers`

---

## Quick Start

### 1. Prerequisites
- **Node.js 24+** (`node -v`)

### 2. Install & Configure
```bash
npm install
cp .env.example .env
```
Edit `.env` to set the WhatsApp number, environment mode (`staging` vs `production`), or public domain URL.

### 3. Local Development (with auto-rebuild)
```bash
npm run dev
```
Open:
- `http://127.0.0.1:3000/en/` (English — default)
- `http://127.0.0.1:3000/de/` (Deutsch)
- `http://127.0.0.1:3000/id/` (Bahasa Indonesia)

> **Note:** `scripts/dev-server.mjs` (`npm run dev` / `npm run preview`) is strictly for local development and QA preview. **Do not use it as a production server** — serve `dist/` behind Nginx/Apache/Cloudflare Pages or mount the views inside Express + `helmet`.

### 4. Production Build & Automated Verification
```bash
npm run build
npm test
npm run security:audit
```

---

## Environment Variables (`.env`)

All configuration is loaded via `src/config/site.config.mjs` (existing host/CI environment variables override local `.env`).

> **Important (Build-Time Injection):** In SSG mode, environment variables are baked into `dist/` during `npm run build`. Whenever you change `SITE_ENV`, `SITE_URL`, `WHATSAPP_NUMBER`, or social links, you **must re-run `npm run build`**.

| Variable | Required | Default (Fallback) | Validation / Notes |
|---|---|---|---|
| `SITE_ENV` | Yes | `staging` | `staging` adds `noindex, nofollow` & `Disallow: /`. Set to `production` for launch. |
| `SITE_URL` | Yes | `https://karimacourses.com` | Must use `https://` (no trailing slash). Used for canonical URLs, `hreflang`, OG tags, and `sitemap.xml`. |
| `PORT` | Local only | `3000` | Port for local `dev-server.mjs` (not used by static hosting). |
| `WHATSAPP_NUMBER` | Yes | `+49 1745635761` | Sanitized to E.164 digits (`8–15` digits) for `https://wa.me/<digits>?text=...`. Displayed as formatted in Footer. |
| `INSTAGRAM_URL` | Optional | `https://www.instagram.com/karimacourses/` | Strictly validated as `https://` (`sanitizeExternalUrl`). |
| `INSTAGRAM_HANDLE` | Optional | `@karimacourses` | Display text shown in Footer contact list. |
| `SUPERPROF_URL` | Optional | *(Ned Taufik Superprof URL)* | Strictly validated as `https://`. |
| `LINKEDIN_URL` | Optional | *(Nediva Taufik LinkedIn URL)* | Strictly validated as `https://`. |

---

## Project Structure

```text
web-karima/
├── .env.example                # Environment template (copy to .env locally; .env is gitignored)
├── deploy/
│   ├── nginx.conf.example      # Production Hostinger VPS Nginx config + TLS + CSP/HSTS
│   └── .htaccess.example       # Production Hostinger Shared/Cloud Hosting config
├── scripts/
│   ├── build.mjs               # Static Site Generator (SCSS + EJS + assets + SEO + _headers)
│   └── dev-server.mjs          # Local dev/preview server with strict security headers (local only)
├── src/
│   ├── config/
│   │   └── site.config.mjs     # Single source of truth for env, URL sanitization & WA builder
│   ├── locales/
│   │   ├── en.json             # English copy & WA message templates
│   │   ├── de.json             # German copy & WA message templates (friendly "Du" tone)
│   │   └── id.json             # Indonesian copy & WA message templates
│   ├── views/
│   │   ├── layouts/base.ejs    # HTML5 shell, SEO/OG/hreflang, self-hosted assets
│   │   ├── pages/              # landing.ejs & root redirect.ejs
│   │   └── partials/           # 11 modular section partials (navbar, hero, about, ...)
│   ├── styles/                 # Design tokens, Bootstrap overrides, per-section SCSS
│   ├── js/                     # CSP-strict vanilla JS (main.js, redirect.js)
│   └── assets/                 # Self-hosted images, icons, and skill illustrations
└── tests/
    └── site.test.mjs           # Automated i18n parity, asset integrity & CSP/security tests
```

---

## Common Updates Guide

| Need to update... | Where to edit |
|---|---|
| Copywriting, pricing, FAQ, testimonials, or WA pre-filled messages | `src/locales/en.json`, `de.json`, `id.json` |
| WhatsApp number, Instagram, Superprof, LinkedIn, or Domain URL | `.env` (or hosting CI/CD environment variables) |
| Colors, typography, radii, shadows | `src/styles/_tokens.scss` |
| Layout or markup of a specific section | `src/views/partials/<section>.ejs` + `src/styles/sections/_<section>.scss` |
| Images, icons, or skill illustrations | `src/assets/images/`, `icons/`, `illustrations/` |

After any change, run `npm run build && npm test` (all 3 locales are checked for 100% key parity and broken asset references).

---

## Backend Handoff & Deployment Guide

### 1. Build Output Contract (`dist/`)
Running `npm ci && npm run build` generates a fully self-contained static bundle in `dist/`:

```text
dist/
├── index.html                  # Root `/` redirect page (redirects to saved lang or /en/)
├── en/index.html               # English landing page (default)
├── de/index.html               # German landing page
├── id/index.html               # Indonesian landing page
├── robots.txt                  # Disallow all in staging; Allow + Sitemap in production
├── sitemap.xml                 # Multi-language sitemap with xhtml:link hreflang
├── _headers                    # Security headers (auto-applied by Cloudflare Pages / Netlify)
└── assets/
    ├── css/main.css            # Compiled Bootstrap 5.3 + custom SCSS (compressed)
    ├── js/                     # bootstrap.bundle.min.js, main.js, redirect.js
    ├── fonts/                  # Self-hosted Plus Jakarta Sans woff2 (400–800, latin + latin-ext)
    ├── images/                 # Brand logo, hero photo, mentor portrait
    ├── icons/                  # UI & social SVG/PNG icons + country flag SVGs
    └── illustrations/          # 5 Essential Language Skills SVGs
```

### 2. Deployment Options

#### Option A — Client Preview / Staging (Cloudflare Pages / Netlify / Vercel)
1. Push this repository to a **Private GitHub repository**.
2. Connect the repository to **Cloudflare Pages** (recommended) or Netlify:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:** `NODE_VERSION=24`, `SITE_ENV=staging`
3. `dist/_headers` automatically applies strict CSP and `X-Robots-Tag: noindex, nofollow`.
   - *Note for Vercel:* Vercel does not read `_headers`; mirror the headers from `dist/_headers` in a `vercel.json` file if deploying there.

#### Option B — Production Deploy on Hostinger
- **Hostinger VPS (Nginx):**
  1. Set `SITE_ENV=production` and `SITE_URL=https://<your-domain>` in `.env` (or CI/CD env).
  2. Run `npm ci && npm run build && npm test`.
  3. Point Nginx `root` to `/var/www/web-karima/dist` using `deploy/nginx.conf.example`.
  4. Replace all `karimacourses.com` domain strings and Let's Encrypt certificate paths with your real domain & Certbot paths.
  5. **Root `/` routing note:** `deploy/nginx.conf.example` uses `location = / { return 302 /en/; }` for an immediate HTTP-level redirect. If you prefer remembering each visitor's last chosen language (`localStorage`), remove that `location = /` block so Nginx serves `dist/index.html` instead.
- **Hostinger Web / Cloud Hosting (Apache / LiteSpeed):**
  1. Build with `SITE_ENV=production` and `SITE_URL=https://<your-domain>`.
  2. Upload the contents of `dist/` to `public_html/`.
  3. Copy `deploy/.htaccess.example` to `public_html/.htaccess`.

#### Option C — Upgrading to Express SSR (Future Backend Features)
If backend features are added later (e.g., contact form API, registration database, CMS), the existing EJS views and config can be mounted directly without rewriting frontend code.

**EJS View Context Contract (`src/views/layouts/base.ejs`):**
- `site` — returned by `getSiteConfig()` from `src/config/site.config.mjs`
- `localeMeta` — matching entry from `site.locales` (`{ code, label, name, htmlLang, ogLocale }`)
- `t` — parsed JSON from `src/locales/${code}.json`
- `waLinks` — map of every key in `t.waMessages` passed through `site.buildWhatsAppUrl(msg)`
- `canonicalUrl` — `${site.siteUrl}/${localeMeta.code}/`

**Minimal Express + Helmet integration sketch:**
```js
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { getSiteConfig, ROOT_DIR } from './src/config/site.config.mjs';

const app = express();
const site = getSiteConfig();

app.set('view engine', 'ejs');
app.set('views', path.join(ROOT_DIR, 'src/views'));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
}));

// Run `npm run build` first (or serve compiled assets from dist/assets)
app.use('/assets', express.static(path.join(ROOT_DIR, 'dist/assets'), { maxAge: '1y', immutable: true }));

app.get('/:lang(en|de|id)/', (req, res) => {
  const localeMeta = site.locales.find((l) => l.code === req.params.lang);
  const t = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'src/locales', `${localeMeta.code}.json`), 'utf8'));
  const waLinks = Object.fromEntries(
    Object.entries(t.waMessages).map(([k, msg]) => [k, site.buildWhatsAppUrl(msg)])
  );
  res.render('layouts/base', {
    site,
    localeMeta,
    t,
    waLinks,
    canonicalUrl: `${site.siteUrl}/${localeMeta.code}/`,
  });
});
```

### 3. Security & CSP Rules for Future Additions
- **Current CSP policy:** `default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`
- **Keep zero inline JS/CSS:** Add new scripts under `src/js/` and styles under `src/styles/` instead of inline `<script>` or `style="..."` attributes so `'unsafe-inline'` is never needed.
- **If adding third-party scripts later** (e.g., GA4, Meta Pixel, Cloudflare Turnstile, or external APIs):
  1. Whitelist only the exact required origins in `script-src`, `connect-src`, or `img-src` in Nginx / `.htaccess` / `scripts/build.mjs`.
  2. **GDPR / DSGVO requirement (Germany/EU):** Do not load marketing/analytics cookies or external scripts before obtaining explicit visitor consent via a Cookie Consent banner, and add *Privacy Policy (Datenschutzerklärung)* & *Imprint (Impressum)* pages linked from the Footer.
- **Keep XSS escaping strict:** Always render locale/user data with `<%= ... %>` in EJS (never `<%- ... %>`).

### 4. Custom Domain Email (`name@yourdomain.com`)
Custom domain email is handled at the **DNS layer** (Hostinger Email, Google Workspace, or Zoho Mail) — not inside the Node.js application. When configuring DNS records for the domain, enable:
- **MX records** — mail routing provided by the email host
- **SPF** (`TXT` record) — authorizes legitimate sending servers
- **DKIM** — cryptographic email signature verification
- **DMARC** (`_dmarc` `TXT` record) — prevents domain spoofing & phishing

---

## Pre-Launch Go-Live Checklist

Before switching DNS to the live production domain:

- [ ] Set `SITE_ENV=production` and `SITE_URL=https://<final-domain>` in server/CI environment variables.
- [ ] Confirm final `WHATSAPP_NUMBER` and social profile URLs in `.env` / CI env.
- [ ] Run `npm ci && npm run build && npm test && npm run security:audit` (0 failures, 0 vulnerabilities).
- [ ] Verify `dist/robots.txt` contains `Allow: /` (not `Disallow: /`) and `dist/en/index.html` contains `<meta name="robots" content="index, follow">`.
- [ ] Enable HTTPS/TLS (Let's Encrypt / Hostinger SSL) **before** enforcing `Strict-Transport-Security` (HSTS).
- [ ] Verify live response headers with `curl -I https://<final-domain>/en/` (CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
- [ ] Confirm `/`, `/en/`, `/de/`, `/id/` routing and WhatsApp Click-to-Chat links on mobile and desktop.
- [ ] Verify custom domain email DNS records (`MX`, `SPF`, `DKIM`, `DMARC`).
