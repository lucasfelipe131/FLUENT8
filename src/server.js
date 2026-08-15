const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildHeuristicCoach, buildOpenAICoach } = require('./coach');
const { hasVoiceAI, processVoice, synthesizeSpeech } = require('./voice');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const MAX_BODY_BYTES = 256 * 1024;
const MAX_VOICE_BODY_BYTES = 4 * 1024 * 1024;
const rateBuckets = new Map();

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

function allowRequest(req, scope, limit, windowMs) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const client = forwarded || req.socket.remoteAddress || 'unknown';
  const key = `${scope}:${client}`;
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter(time => now - time < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  rateBuckets.set(key, recent);
  if (rateBuckets.size > 2000) {
    for (const [bucket, times] of rateBuckets) {
      if (!times.some(time => now - time < windowMs)) rateBuckets.delete(bucket);
    }
  }
  return true;
}

function readJson(req, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw) > limit) {
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
    return sendJson(res, 200, { ok: true, service: 'fluent8', version: '4.0.0', voice_ai: hasVoiceAI() });
  }

  if (url.pathname === '/api/config' && req.method === 'GET') {
    return sendJson(res, 200, {
      voice_ai: hasVoiceAI(),
      languages: ['en', 'es', 'fr'],
      max_recording_seconds: 30
    });
  }

  if (url.pathname === '/api/voice' && req.method === 'POST') {
    if (!allowRequest(req, 'voice', 30, 15 * 60 * 1000)) return sendJson(res, 429, { error: 'rate_limited' });
    try {
      const body = await readJson(req, MAX_VOICE_BODY_BYTES);
      const result = await processVoice(body);
      return sendJson(res, 200, result);
    } catch (error) {
      const status = error.statusCode
        || (error.message === 'payload_too_large' || error.message === 'audio_too_large' ? 413
          : error.message === 'voice_ai_not_configured' ? 503
          : 400);
      return sendJson(res, status, { error: error.message });
    }
  }

  if (url.pathname === '/api/speech' && req.method === 'POST') {
    if (!allowRequest(req, 'speech', 80, 15 * 60 * 1000)) return sendJson(res, 429, { error: 'rate_limited' });
    if (!hasVoiceAI()) return sendJson(res, 503, { error: 'voice_ai_not_configured' });
    try {
      const body = await readJson(req);
      const audio = await synthesizeSpeech(body.text, body.lang);
      return sendJson(res, 200, { audio });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
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
  console.log(`Fluent8 v4 running on port ${PORT}`);
});
