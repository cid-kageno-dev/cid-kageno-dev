const express = require('express');
const https   = require('https');
const http    = require('http');
const crypto  = require('crypto');
const path    = require('path');
const session = require('express-session');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

// ── Session ────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────
function request(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const mod    = parsed.protocol === 'https:' ? https : http;
    const opts   = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   options.method || (body ? 'POST' : 'GET'),
      headers:  {
        'User-Agent': 'portfolio-site/1.0',
        'Accept':     'application/json',
        ...options.headers,
      },
    };
    if (body) {
      const raw = typeof body === 'string' ? body : JSON.stringify(body);
      opts.headers['Content-Type']   = options.contentType || 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(raw);
    }
    const req = mod.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// ── GitHub OAuth ───────────────────────────────────────────────────────────
const GH_CLIENT_ID     = process.env.GITHUB_CLIENT_ID;
const GH_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

app.get('/api/login', (req, res) => {
  if (!GH_CLIENT_ID) {
    return res.status(503).send('GitHub OAuth not configured — set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
  }
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', GH_CLIENT_ID);
  url.searchParams.set('scope', 'read:user user:email');
  url.searchParams.set('state', state);
  res.redirect(url.toString());
});

app.get('/api/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('[github-oauth] provider error:', error);
    return res.redirect('/Ani/?error=' + encodeURIComponent(error));
  }

  if (!state || state !== req.session.oauthState) {
    console.error('[github-oauth] state mismatch');
    return res.redirect('/Ani/?error=state_mismatch');
  }
  delete req.session.oauthState;

  try {
    // 1. Exchange code for access token
    const tokenRes = await request(
      'https://github.com/login/oauth/access_token',
      { headers: { Accept: 'application/json' } },
      { client_id: GH_CLIENT_ID, client_secret: GH_CLIENT_SECRET, code }
    );
    const tokenData = JSON.parse(tokenRes.body);
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('[github-oauth] no access_token:', tokenRes.body);
      return res.redirect('/Ani/?error=token_exchange_failed');
    }

    // 2. Fetch user profile
    const userRes = await request('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ghUser = JSON.parse(userRes.body);

    // 3. Fetch primary email if not public
    let email = ghUser.email || null;
    if (!email) {
      try {
        const emailRes = await request('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const emails = JSON.parse(emailRes.body);
        const primary = Array.isArray(emails) && emails.find(e => e.primary && e.verified);
        email = primary ? primary.email : null;
      } catch (_) {}
    }

    req.session.user = {
      id:      String(ghUser.id),
      name:    ghUser.name || ghUser.login || 'User',
      login:   ghUser.login,
      email:   email,
      picture: ghUser.avatar_url || null,
    };

    res.redirect('/Ani/');
  } catch (err) {
    console.error('[github-oauth] callback error:', err.message);
    res.redirect('/Ani/?error=login_failed');
  }
});

app.get('/api/auth/user', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/Ani/'));
});

// ── Public client config (Supabase URL + anon key are safe to expose) ─────
app.get('/api/config', (_req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL  || '',
    supabaseKey: process.env.SUPABASE_ANON_KEY || '',
  });
});

// ── GitHub repos proxy ────────────────────────────────────────────────────
app.get('/api/github-repos', async (req, res) => {
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

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serving on port ${PORT}`);
  if (process.env.SUPABASE_URL) {
    console.log('[auth] Supabase configured');
  } else {
    console.warn('[auth] SUPABASE_URL not set — auth will not work');
  }
});

module.exports = app;
