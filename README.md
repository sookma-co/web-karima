# web-karima — Karima Courses Landing Page

Responsive, multi-language (**English, German, Indonesian**), security-hardened landing page for **Karima Courses**, managed by Sookma Digital.

Built with **Node.js 24**, **Bootstrap 5.3 (SCSS)**, and **EJS templates** so it runs today as a fast, zero-backend static build (`dist/`) and can be upgraded directly to **Express SSR** without rewriting any views or styles.

---

## Tech Stack & Highlights

- **Runtime:** Node.js `>= 24.0.0` (ESM, native `process.loadEnvFile`, native `node:test`)
- **UI Framework:** Bootstrap 5.3 via npm + custom modular SCSS (`src/styles/`)
- **Templates:** Modular EJS partials (`src/views/partials/`) — 1 file per section
- **Multi-Language URLs:** `/en/` (default), `/de/`, `/id/` driven by `src/locales/*.json`
- **WhatsApp Click-to-Chat:** Centralized in `.env` + `src/config/site.config.mjs` with per-CTA, per-language pre-filled messages
- **GDPR / DSGVO & Security Ready:**
  - **100% self-hosted assets & fonts** (`@fontsource/plus-jakarta-sans`, Bootstrap 5.3, SVG/PNG icons, illustrations) — zero Google Fonts or external CDN requests
  - **Strict CSP** (`default-src 'self'`, zero inline `<script>`, zero inline `style=`, zero `data:image/svg+xml`)
  - **Staging protection:** `SITE_ENV=staging` automatically adds `noindex, nofollow` so preview links aren't indexed before launch

---

## Quick Start

### 1. Prerequisites
- **Node.js 24+** (`node -v`)

### 2. Install & Configure
```bash
npm install
cp .env.example .env
```
Edit `.env` if you need to adjust the WhatsApp number, environment mode (`staging` vs `production`), or domain URL.

### 3. Local Development (with auto-rebuild)
```bash
npm run dev
```
Open:
- `http://127.0.0.1:3000/en/` (English — default)
- `http://127.0.0.1:3000/de/` (Deutsch)
- `http://127.0.0.1:3000/id/` (Bahasa Indonesia)

### 4. Production Build & Automated Security/Integrity Tests
```bash
npm run build
npm test
npm run security:audit
```

---

## Project Structure (Maintenance & Backend Handoff)

```text
web-karima/
├── .env.example                # Environment template (copy to .env locally)
├── deploy/
│   ├── nginx.conf.example      # Production Hostinger VPS Nginx config + CSP/HSTS
│   └── .htaccess.example       # Production Hostinger Shared/Cloud Hosting config
├── scripts/
│   ├── build.mjs               # Static Site Generator (SCSS + EJS + assets + SEO + _headers)
│   └── dev-server.mjs          # Local dev/preview server with strict security headers
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
    └── site.test.mjs           # Automated i18n parity, asset existence & CSP/security tests
```

---

## Common Updates Guide

| Need to update... | Where to edit |
|---|---|
| Text, pricing, FAQ, testimonials, or WA pre-filled messages | `src/locales/en.json`, `de.json`, `id.json` |
| WhatsApp number, Instagram, Superprof, LinkedIn, or Domain URL | `.env` (or hosting environment variables) |
| Colors, typography, radii, shadows | `src/styles/_tokens.scss` |
| Layout or markup of a specific section | `src/views/partials/<section>.ejs` + `src/styles/sections/_<section>.scss` |
| Images, icons, or illustrations | `src/assets/images/`, `icons/`, `illustrations/` |

After any change, run `npm run build && npm test`.

---

## Backend Handoff & Deployment Notes

### Option A — Client Preview / Staging (Cloudflare Pages / Vercel / Netlify)
1. Push this repository to a **Private GitHub repository**.
2. Connect the repository to **Cloudflare Pages** (recommended) or Netlify/Vercel:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:** `NODE_VERSION=24`, `SITE_ENV=staging`
3. `dist/_headers` automatically applies strict CSP + `X-Robots-Tag: noindex, nofollow`.

### Option B — Production Deploy on Hostinger
- **Hostinger VPS (Nginx):**
  1. Set `SITE_ENV=production` and `SITE_URL=https://yourdomain.com` in `.env` (or CI env).
  2. Run `npm ci && npm run build`.
  3. Serve `dist/` using `deploy/nginx.conf.example` with Let's Encrypt TLS.
- **Hostinger Web / Cloud Hosting (Apache / LiteSpeed):**
  1. Build with `SITE_ENV=production` and upload contents of `dist/` to `public_html/`.
  2. Copy `deploy/.htaccess.example` as `public_html/.htaccess`.

### Option C — Future Upgrade to Express SSR
Because `src/views/` uses standard EJS templates and `src/config/site.config.mjs` is framework-agnostic, the backend team can mount Express with `app.set('view engine', 'ejs')`, serve `dist/assets/` statically, attach `helmet`, and render `views/layouts/base.ejs` directly with the exact same `site`, `localeMeta`, `t`, and `waLinks` context.

### Custom Domain Email (`name@yourdomain.com`)
Custom domain email is managed at the **DNS layer** (Hostinger Email, Google Workspace, or Zoho Mail) — not inside the Node.js codebase. When configuring DNS records for the domain, ensure these records are enabled for email security and deliverability:
- **MX records** (from your email provider)
- **SPF** (`TXT` record authorizing the mail server)
- **DKIM** (cryptographic email signing)
- **DMARC** (`_dmarc` `TXT` record to prevent spoofing)
