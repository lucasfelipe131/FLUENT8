const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildHeuristicCoach, buildOpenAICoach } = require('./coach');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const MAX_BODY_BYTES = 256 * 1024;

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
        reject(new Error('payload_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}

function resolvePublicFile(pathname) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const candidate = path.resolve(PUBLIC_DIR, relative);
  return candidate === PUBLIC_DIR || candidate.startsWith(`${PUBLIC_DIR}${path.sep}`) ? candidate : null;
}

function serveFile(req, res, pathname) {
  const file = resolvePublicFile(pathname);
  if (!file) return sendJson(res, 403, { error: 'forbidden' });
  fs.stat(file, (error, stats) => {
    if (error || !stats.isFile()) return sendJson(res, 404, { error: 'not_found' });
    const extension = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[extension] || 'application/octet-stream',
      'cache-control': pathname === '/' || pathname === '/index.html' || pathname === '/sw.js' ? 'no-cache' : 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'microphone=(self)'
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/health') {
    return sendJson(res, 200, { ok: true, service: 'fluent8', version: '3.0.0' });
  }

  if (url.pathname === '/api/coach' && req.method === 'POST') {
    try {
      const body = await readJson(req);
      const ai = await buildOpenAICoach(body);
      return sendJson(res, 200, ai || buildHeuristicCoach(body));
    } catch (error) {
      const status = error.message === 'payload_too_large' ? 413 : 400;
      return sendJson(res, status, { error: error.message });
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'method_not_allowed' });
  }

  return serveFile(req, res, url.pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Fluent8 v3 running on port ${PORT}`);
});
