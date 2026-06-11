const express    = require('express');
const https      = require('https');
const path       = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// ── In-memory OTP store: email → { code, expiresAt } ──────────────────────
const otpStore = new Map();

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

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

// ── Send OTP ──────────────────────────────────────────────────────────────
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({ error: 'Email service not configured on server.' });
  }

  const code = generateOTP();
  otpStore.set(email.toLowerCase(), { code, expiresAt: Date.now() + 10 * 60 * 1000 });

  try {
    const transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from:    `"Cid Kageno" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'Your verification code',
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:36px 32px;background:#0f0f15;color:#fff;border-radius:16px;border:1px solid rgba(124,106,247,0.15)">
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:700">Verify your email</h2>
          <p style="color:rgba(255,255,255,0.55);margin:0 0 28px;font-size:14px;line-height:1.6">Enter this code to complete your sign-up. It expires in <strong style="color:rgba(255,255,255,0.8)">10 minutes</strong>.</p>
          <div style="font-size:44px;font-weight:800;letter-spacing:14px;color:#7c6af7;text-align:center;padding:22px 16px;background:rgba(124,106,247,0.08);border-radius:14px;border:1px solid rgba(124,106,247,0.2);font-family:monospace">${code}</div>
          <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:24px 0 0;text-align:center">If you didn't request this, you can safely ignore this email.</p>
        </div>`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('OTP email error:', err.message);
    otpStore.delete(email.toLowerCase());
    res.status(500).json({ error: 'Failed to send verification email.' });
  }
});

// ── Verify OTP ────────────────────────────────────────────────────────────
app.post('/api/verify-otp', (req, res) => {
  const { email, code } = req.body;
  const key   = email?.toLowerCase();
  const entry = otpStore.get(key);

  if (!entry) {
    return res.status(400).json({ error: 'No code found for this email. Request a new one.' });
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return res.status(400).json({ error: 'Code expired. Please request a new one.' });
  }
  if (entry.code !== String(code).trim()) {
    return res.status(400).json({ error: 'Incorrect code. Please try again.' });
  }

  otpStore.delete(key);
  res.json({ ok: true });
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

    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyAxyBAXzN9hiNjr5dx50I9xrrtImVEbD6k';

    if (token) {
      try {
        const verifyRes = await httpsPost(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
          { idToken: token }
        );
        if (verifyRes.status === 200) {
          const data = JSON.parse(verifyRes.body);
          const user = data.users && data.users[0];
          if (user) {
            userName = user.displayName || (user.email ? user.email.split('@')[0] : 'Guest');
          }
        }
      } catch (_) {}
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

// ── Static files ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname), { index: 'index.html' }));

// ── Vercel / local dual-mode export ───────────────────────────────────────
module.exports = app;

if (require.main === module) {
  app.listen(5000, '0.0.0.0', () => console.log('Serving on port 5000'));
}
