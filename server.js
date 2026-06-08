const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const MIME = {
  html: 'text/html',
  css:  'text/css',
  js:   'text/javascript',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  svg:  'image/svg+xml',
  ico:  'image/x-icon',
  webp: 'image/webp',
};

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (urlPath === '/api/github-repos' && req.method === 'GET') {
    try {
      const ghHeaders = {};
      if (process.env.GITHUB_TOKEN) ghHeaders['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
      const ghRes = await httpsGet(
        'https://api.github.com/users/cid-kageno-dev/repos?sort=updated&per_page=50',
        ghHeaders
      );
      res.writeHead(ghRes.status, { 'Content-Type': 'application/json' });
      res.end(ghRes.body);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch repos' }));
    }
    return;
  }

  if (urlPath === '/api/chat' && req.method === 'POST') {
    try {
      const raw     = await readBody(req);
      const { message } = JSON.parse(raw);

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

      // ── Forward to Ani backend with user identity injected ──────────────
      // Your Ani backend receives `message` and `userName`.
      // In your backend's system prompt, reference userName like:
      //   "You are Ani. You are currently talking to ${userName}. Greet them by name."
      const renderRes = await httpsPost(
        'https://ani-jms7.onrender.com/api/chat',
        { message, userName }
      );

      res.writeHead(renderRes.status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(renderRes.body);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
    res.end();
    return;
  }

  let filePath = path.join('.', urlPath === '/' ? '/index.html' : urlPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      const ext = path.extname(filePath).slice(1);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    }
  });
});

server.listen(5000, '0.0.0.0', () => console.log('Serving on port 5000'));
