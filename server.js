const express = require('express');
const https   = require('https');
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

// ── Replit OIDC (openid-client v6, loaded via dynamic import) ──────────────
let oidcConfig = null;

async function setupOidc() {
  const replId = process.env.REPL_ID;
  if (!replId) {
    console.warn('[auth] REPL_ID not set — Replit Auth disabled');
    return;
  }
  try {
    const { discovery } = await import('openid-client');
    oidcConfig = await discovery(new URL('https://replit.com/oidc'), replId);
    console.log('[auth] Replit OIDC ready');
  } catch (err) {
    console.error('[auth] OIDC discovery failed:', err.message);
  }
}

// ── Auth Routes ────────────────────────────────────────────────────────────

app.get('/api/login', async (req, res) => {
  if (!oidcConfig) {
    return res.status(503).send('Auth not configured (REPL_ID missing)');
  }
  try {
    const {
      buildAuthorizationUrl,
      generateRandomCodeVerifier,
      calculatePKCECodeChallenge,
      generateRandomState,
    } = await import('openid-client');

    const codeVerifier = generateRandomCodeVerifier();
    const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
    const state = generateRandomState();

    req.session.oidc = { codeVerifier, state };

    const redirectUrl = buildAuthorizationUrl(oidcConfig, {
      redirect_uri: `https://${req.hostname}/api/callback`,
      scope: 'openid email profile offline_access',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      prompt: 'login consent',
    });

    res.redirect(redirectUrl.href);
  } catch (err) {
    console.error('[auth] login error:', err.message);
    res.redirect('/Ani/?auth_error=login_failed');
  }
});

app.get('/api/callback', async (req, res) => {
  if (!oidcConfig) return res.redirect('/Ani/');

  const oidcSession = req.session.oidc || {};
  const { codeVerifier, state } = oidcSession;
  delete req.session.oidc;

  try {
    const { authorizationCodeGrant } = await import('openid-client');

    const callbackUrl = new URL(`https://${req.hostname}/api/callback`);
    callbackUrl.search = new URLSearchParams(req.query).toString();

    const tokens = await authorizationCodeGrant(oidcConfig, callbackUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState: state,
    });

    const claims = tokens.claims();
    req.session.user = {
      id:      claims.sub,
      name:    claims.first_name || claims.name || (claims.email ? claims.email.split('@')[0] : 'User'),
      email:   claims.email   || null,
      picture: claims.profile_image_url || null,
    };

    res.redirect('/Ani/');
  } catch (err) {
    console.error('[auth] callback error:', err.message);
    res.redirect('/Ani/?auth_error=login_failed');
  }
});

app.get('/api/auth/user', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/Ani/'));
});

// ── Helpers ────────────────────────────────────────────────────────────────

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
  } catch (err) {
    console.error('[github-repos]', err.message);
    res.status(500).json({ error: 'Failed to fetch repos' });
  }
});

// ── Chat proxy ─────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const userName = req.session.user ? (req.session.user.name || 'Guest') : 'Guest';

    const renderRes = await httpsPost(
      'https://ani-jms7.onrender.com/api/chat',
      { message, userName }
    );

    res.status(renderRes.status).type('json').send(renderRes.body);
  } catch (err) {
    console.error('[chat]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Static files ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname), { index: 'index.html' }));

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

setupOidc().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`Serving on port ${PORT}`));
});

module.exports = app;
