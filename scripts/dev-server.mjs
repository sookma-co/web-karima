import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { buildSite, STRICT_CSP } from './build.mjs';
import { getSiteConfig, ROOT_DIR } from '../src/config/site.config.mjs';

const DIST_DIR = path.join(ROOT_DIR, 'dist');
const SRC_DIR = path.join(ROOT_DIR, 'src');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

function applySecurityHeaders(res, isProduction) {
  res.setHeader('Content-Security-Policy', STRICT_CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (!isProduction) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
}

function resolveSafeFile(urlPathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPathname);
  } catch {
    return null;
  }

  // Normalize and prevent path traversal outside DIST_DIR
  const normalized = path.posix.normalize(decodedPath);
  const relative = normalized.replace(/^\/+/, '');
  let candidate = path.resolve(DIST_DIR, relative);

  if (!candidate.startsWith(DIST_DIR)) {
    return null;
  }

  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    candidate = path.join(candidate, 'index.html');
  }

  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    return null;
  }

  return candidate;
}

async function start() {
  const args = new Set(process.argv.slice(2));
  const shouldWatch = args.has('--watch');

  // Always build before starting dev/preview server
  const { site, elapsedMs } = await buildSite();
  console.log(`[server] Initial build ready in ${elapsedMs}ms (env=${site.env})`);

  const host = process.env.HOST || '127.0.0.1';
  const port = site.port;

  const server = http.createServer((req, res) => {
    const method = req.method || 'GET';
    if (method !== 'GET' && method !== 'HEAD') {
      applySecurityHeaders(res, site.isProduction);
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    const parsedUrl = new URL(req.url || '/', `http://${host}:${port}`);

    // Clean redirect for /en, /de, /id without trailing slash
    if (/^\/(en|de|id)$/.test(parsedUrl.pathname)) {
      applySecurityHeaders(res, site.isProduction);
      res.writeHead(301, { Location: `${parsedUrl.pathname}/` });
      res.end();
      return;
    }

    const filePath = resolveSafeFile(parsedUrl.pathname);
    applySecurityHeaders(res, site.isProduction);

    if (!filePath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });

    if (method === 'HEAD') {
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(port, host, () => {
    console.log(`[server] Karima Courses running at http://${host}:${port}/`);
    console.log(`[server] Localized URLs: /en/  /de/  /id/`);
  });

  if (shouldWatch) {
    let timer = null;
    let building = false;

    const triggerRebuild = () => {
      if (building) return;
      building = true;
      buildSite()
        .then(({ elapsedMs: ms }) => console.log(`[watch] Rebuilt in ${ms}ms`))
        .catch((err) => console.error('[watch] Rebuild error:', err.message))
        .finally(() => {
          building = false;
        });
    };

    fs.watch(SRC_DIR, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      clearTimeout(timer);
      timer = setTimeout(triggerRebuild, 150);
    });
    console.log('[watch] Watching src/ for changes...');
  }
}

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exitCode = 1;
});
