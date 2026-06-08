const http = require('http');
const https = require('https');
const fs   = require('fs');
const path = require('path');

const MIME = {
  html: 'text/html',
  css:  'text/css',
  js:   'text/javascript',
  json: 'application/json',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  svg:  'image/svg+xml',
  ico:  'image/x-icon',
  webp: 'image/webp',
  ts:   'text/plain',
};

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

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── GitHub repos proxy (frontend falls back to direct API if unavailable) ─
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
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch repos' }));
    }
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // ── Static file serving ────────────────────────────────────────────────
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
