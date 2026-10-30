import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../lib/db.js';
import { audit } from '../lib/audit.js';
import { signJwt, rateLimit, wrap, requireRole } from '../middleware.js';
import { randomKey } from '../lib/crypto.js';

const r = Router();

async function turnstileOk(token, ip) {
  if (!process.env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip || '' }),
    });
    return (await res.json()).success === true;
  } catch {
    return false;
  }
}

r.get('/config', (_req, res) => res.json({ turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null }));

r.post('/login', rateLimit('login', 10, 60_000), wrap(async (req, res) => {
  const { email, password, turnstile } = req.body || {};
  if (!(await turnstileOk(turnstile, req.ip))) return res.status(400).json({ error: 'Bot check failed. Please retry.' });
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase().trim());
  if (!u || !bcrypt.compareSync(String(password || ''), u.password_hash)) {
    audit({ role: 'anonymous' }, 'LOGIN_FAILED', String(email || '').slice(0, 80));
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  audit(u, 'LOGIN', u.email);
  res.json({ token: signJwt(u), user: { id: u.id, email: u.email, name: u.name, role: u.role, institution_id: u.institution_id, student_id: u.student_id } });
}));

r.get('/me', requireRole(), (req, res) => {
  const u = db.prepare('SELECT id, email, name, role, institution_id, student_id, api_key FROM users WHERE id = ?').get(req.user.id);
  const inst = u.institution_id ? db.prepare('SELECT id, name, state, district, aicte_id FROM institutions WHERE id = ?').get(u.institution_id) : null;
  res.json({ ...u, institution: inst });
});

r.post('/api-key/rotate', requireRole('institution'), (req, res) => {
  const k = randomKey('prm');
  db.prepare('UPDATE users SET api_key = ? WHERE id = ?').run(k, req.user.id);
  audit(req.user, 'API_KEY_ROTATED', `user:${req.user.id}`);
  res.json({ api_key: k });
});

export default r;
