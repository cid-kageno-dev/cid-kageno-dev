const express = require('express');
const https   = require('https');
const path    = require('path');

const app = express();
app.use(express.json());

// ── Helpers ───────────────────────────────────────────────────────────────

function httpsPost(url, data) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body   = JSON.stringify(data);
    const options = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'GET',
      headers:  { 'User-Agent': 'portfolio-site', ...headers },
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.end();
  });
}

// ── CORS preflight ────────────────────────────────────────────────────────
app.options('*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }).sendStatus(204);
});

// ── GitHub repos proxy ────────────────────────────────────────────────────
app.get('/api/github-repos', async (req, res) => {
  try {
    const ghHeaders = {};
    if (process.env.GITHUB_TOKEN) ghHeaders['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    const ghRes = await httpsGet(
      'https://api.github.com/users/cid-kageno-dev/repos?sort=updated&per_page=50',
      ghHeaders
    );
    res.status(ghRes.status).type('json').send(ghRes.body);
  } catch {
    res.status(500).json({ error: 'Failed to fetch repos' });
  }
});

// ── Chat proxy (forwards to Ani backend on Render with user identity) ─────
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    let userName = 'Guest';

    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token && process.env.FIREBASE_API_KEY) {
      try {
        const verifyRes = await httpsPost(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`,
          { idToken: token }
        );
        if (verifyRes.status === 200) {
          const data = JSON.parse(verifyRes.body);
          const user = data.users && data.users[0];
          if (user) {
            userName = user.displayName || (user.email ? user.email.split('@')[0] : 'Guest');
          }
        }
      } catch (_) {
        // Token verification failed — fall back to Guest
      }
    }

    const renderRes = await httpsPost(
      'https://ani-jms7.onrender.com/api/chat',
      { message, userName }
    );

    res.set('Access-Control-Allow-Origin', '*')
       .status(renderRes.status)
       .type('json')
       .send(renderRes.body);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Static files (serves index.html, Ani/, assets/, etc.) ─────────────────
app.use(express.static(path.join(__dirname), { index: 'index.html' }));

// ── Vercel / local dual-mode export ───────────────────────────────────────
// When imported by Vercel's serverless runtime, `module.exports` is used.
// When run directly with `node server.js`, the listen call starts the server.
module.exports = app;

if (require.main === module) {
  app.listen(5000, '0.0.0.0', () => console.log('Serving on port 5000'));
}
