const http = require('http');
const fs = require('fs');
const path = require('path');

const FIREBASE_CONFIG_JS = `window.FIREBASE_CONFIG = ${JSON.stringify({
  apiKey: "aksgemmnimsjshsvsnsv",
  authDomain: "gen-lang-client-0109922552.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0109922552-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gen-lang-client-0109922552",
  storageBucket: "gen-lang-client-0109922552.firebasestorage.app",
  messagingSenderId: "855156398200",
  appId: "1:855156398200:web:8efc43c8e434263ea5358d"
})};`;

const MIME = {
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  webp: 'image/webp',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/firebase-config.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(FIREBASE_CONFIG_JS);
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
