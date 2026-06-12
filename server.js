const express  = require('express');
const https    = require('https');
const path     = require('path');
const session  = require('express-session');
const passport = require('passport');
const OidcStrategy = require('passport-openidconnect');

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

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ── Replit OIDC Setup ──────────────────────────────────────────────────────
const REPLIT_ISSUER = 'https://replit.com/oidc';

function getCallbackUrl(hostname) {
  return `https://${hostname}/api/callback`;
}

async function getOidcIssuerMeta() {
  return new Promise((resolve, reject) => {
    const url = `${REPLIT_ISSUER}/.well-known/openid-configuration`;
    const parsed = new URL(url);
    https.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { 'User-Agent': 'portfolio-site' },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

let oidcMeta = null;

async function setupOidc() {
  const replId = process.env.REPL_ID;
  if (!replId) {
    console.warn('[auth] REPL_ID not set — Replit Auth disabled');
    return;
  }

  try {
    oidcMeta = await getOidcIssuerMeta();
    console.log('[auth] Replit OIDC discovery complete');
  } catch (err) {
    console.error('[auth] OIDC discovery failed:', err.message);
    return;
  }

  // Strategy is registered per-request so the callback URL matches the hostname
  app.get('/api/login', (req, res, next) => {
    const hostname = req.hostname;
    const strategyName = `replit:${hostname}`;

    if (!passport._strategies[strategyName]) {
      passport.use(strategyName, new OidcStrategy({
        issuer:               REPLIT_ISSUER,
        authorizationURL:     oidcMeta.authorization_endpoint,
        tokenURL:             oidcMeta.token_endpoint,
        userInfoURL:          oidcMeta.userinfo_endpoint,
        clientID:             replId,
        clientSecret:         replId,   // Replit PKCE — client_secret == client_id
        callbackURL:          getCallbackUrl(hostname),
        scope:                'openid email profile offline_access',
        passReqToCallback:    false,
        skipUserProfile:      false,
      }, (_issuer, profile, done) => {
        const user = {
          id:      profile.id,
          name:    profile.displayName || profile.username || 'User',
          email:   (profile.emails && profile.emails[0] && profile.emails[0].value) || null,
          picture: (profile.photos  && profile.photos[0]  && profile.photos[0].value)  || null,
        };
        return done(null, user);
      }));
    }

    passport.authenticate(strategyName, {
      prompt: 'login consent',
    })(req, res, next);
  });

  app.get('/api/callback', (req, res, next) => {
    const hostname = req.hostname;
    const strategyName = `replit:${hostname}`;
    passport.authenticate(strategyName, {
      successRedirect: '/Ani/',
      failureRedirect: '/Ani/?auth_error=login_failed',
    })(req, res, next);
  });
}

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

// ── Auth Routes ────────────────────────────────────────────────────────────
app.get('/api/auth/user', (req, res) => {
  res.json({ user: (req.isAuthenticated() && req.user) ? req.user : null });
});

app.get('/api/logout', (req, res) => {
  req.logout(() => res.redirect('/Ani/'));
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
  } catch (err) {
    console.error('[github-repos]', err.message);
    res.status(500).json({ error: 'Failed to fetch repos' });
  }
});

// ── Chat proxy ─────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const userName = (req.isAuthenticated() && req.user)
      ? (req.user.name || 'Guest')
      : 'Guest';

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
