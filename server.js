const express = require('express');
const https   = require('https');
const http    = require('http');
const path    = require('path');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

// ── HTTP helper ────────────────────────────────────────────────────────────
function request(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const mod    = parsed.protocol === 'https:' ? https : http;
    const raw    = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const opts   = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   options.method || (raw ? 'POST' : 'GET'),
      headers:  {
        'User-Agent': 'portfolio-site/1.0',
        'Accept':     'application/json',
        ...options.headers,
      },
    };
    if (raw) {
      opts.headers['Content-Type']   = options.contentType || 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(raw);
    }
    const req = mod.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (raw) req.write(raw);
    req.end();
  });
}

// ── Public Supabase config (anon key is safe to expose) ───────────────────
app.get('/api/config', (_req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL      || '',
    supabaseKey: process.env.SUPABASE_ANON_KEY || '',
  });
});

// ── GitHub repos proxy ────────────────────────────────────────────────────
app.get('/api/github-repos', async (_req, res) => {
  try {
    const headers = {};
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    const r = await request(
      'https://api.github.com/users/cid-kageno-dev/repos?sort=updated&per_page=50',
      { headers }
    );
    res.status(r.status).type('json').send(r.body);
  } catch (err) {
    console.error('[github-repos]', err.message);
    res.status(500).json({ error: 'Failed to fetch repos' });
  }
});

// ── Chat proxy ─────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userName = 'Guest' } = req.body;
    const r = await request(
      'https://ani-jms7.onrender.com/api/chat',
      {},
      { message, userName }
    );
    res.status(r.status).type('json').send(r.body);
  } catch (err) {
    console.error('[chat]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Static files ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname), { index: 'index.html' }));

// ── Start (local dev only — Vercel imports this file as a module) ──────────
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serving on port ${PORT}`);
    console.log(process.env.SUPABASE_URL ? '[auth] Supabase configured' : '[auth] SUPABASE_URL not set');
  });
}

module.exports = app;
