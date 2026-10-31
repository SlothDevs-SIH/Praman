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

// Public live stats for the Samanvay-styled hero floating card and ExpandableScreen
r.get('/public/live', (_req, res) => {
  const stu = db.prepare("SELECT COUNT(*) c FROM students WHERE status != 'WITHDRAWN'").get()?.c || 0;
  const inst = db.prepare('SELECT COUNT(*) c FROM institutions').get()?.c || 0;
  const flags = db.prepare("SELECT COUNT(*) c FROM flags WHERE status = 'open'").get()?.c || 0;
  const handshakes = db.prepare("SELECT COUNT(*) c FROM handshakes WHERE status = 'pending'").get()?.c || 0;
  const sampleH = db.prepare(`
    SELECT h.id, ia.name inst_a_name, ib.name inst_b_name, s.name student_name, p.name program_name, s.admission_year
    FROM handshakes h
    JOIN institutions ia ON ia.id = h.inst_a
    JOIN institutions ib ON ib.id = h.inst_b
    JOIN students s ON s.id = h.student_a
    JOIN programs p ON p.id = s.program_id
    WHERE h.status = 'pending'
    ORDER BY CASE WHEN h.inst_a = 1 OR h.inst_b = 1 THEN 0 ELSE 1 END, h.id ASC LIMIT 1
  `).get();
  const sampleF = db.prepare(`
    SELECT f.id, f.type, f.message, i.name institution, f.year
    FROM flags f
    LEFT JOIN institutions i ON i.id = f.institution_id
    WHERE f.status = 'open'
    ORDER BY CASE f.severity WHEN 'high' THEN 0 ELSE 1 END, f.id DESC LIMIT 1
  `).get();

  res.json({
    students: stu,
    institutions: inst,
    open_flags: flags,
    pending_handshakes: handshakes,
    sample_handshake: sampleH || null,
    sample_flag: sampleF || null,
  });
});

r.post('/login', rateLimit('login', 20, 60_000), wrap(async (req, res) => {
  const { email, password, turnstile } = req.body || {};
  if (!(await turnstileOk(turnstile, req.ip))) return res.status(400).json({ error: 'Bot check failed. Please retry.' });
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase().trim());
  if (!u || !bcrypt.compareSync(String(password || ''), u.password_hash)) {
    audit({ role: 'anonymous' }, 'LOGIN_FAILED', String(email || '').slice(0, 80));
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  audit(u, 'LOGIN', u.email);
  res.json({
    token: signJwt(u),
    user: { id: u.id, email: u.email, name: u.name, role: u.role, institution_id: u.institution_id, student_id: u.student_id },
  });
}));

// Samanvay-style self-registration (sets role = 'new' so ChooseRole onboarding screen appears)
r.post('/register', rateLimit('register', 15, 60_000), wrap(async (req, res) => {
  const { name, email, password } = req.body || {};
  const cleanEmail = String(email || '').toLowerCase().trim();
  const cleanName = String(name || '').trim();
  if (!cleanEmail || !cleanEmail.includes('@')) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!cleanName || cleanName.length < 2) return res.status(400).json({ error: 'Enter your full name.' });
  if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (exists) return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });

  const pwHash = bcrypt.hashSync(String(password), 8);
  const info = db.prepare('INSERT INTO users (email, password_hash, role, name, institution_id, student_id, api_key) VALUES (?,?,?,?,?,?,?)')
    .run(cleanEmail, pwHash, 'new', cleanName, null, null, null);
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid));
  audit(u, 'REGISTER', u.email);
  res.json({
    token: signJwt(u),
    user: { id: u.id, email: u.email, name: u.name, role: u.role, institution_id: u.institution_id, student_id: u.student_id },
  });
}));

// Complete onboarding role selection
r.post('/role', requireRole(), wrap(async (req, res) => {
  const { role, institution_id } = req.body || {};
  const allowed = ['verifier', 'institution', 'regulator', 'student', 'admin'];
  if (!allowed.includes(role)) return res.status(400).json({ error: 'Choose a valid portal role.' });

  let instId = null;
  let stuId = null;
  let apiKey = null;

  if (role === 'institution') {
    instId = Number(institution_id) || 1;
    apiKey = randomKey('prm');
  } else if (role === 'student') {
    const sampleStu = db.prepare('SELECT id FROM students WHERE institution_id = 1 ORDER BY id LIMIT 1').get();
    stuId = sampleStu?.id || 1;
  }

  db.prepare('UPDATE users SET role = ?, institution_id = ?, student_id = ?, api_key = COALESCE(api_key, ?) WHERE id = ?')
    .run(role, instId, stuId, apiKey, req.user.id);
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const inst = u.institution_id ? db.prepare('SELECT id, name, state, district, aicte_id FROM institutions WHERE id = ?').get(u.institution_id) : null;
  audit(u, 'ROLE_SELECTED', `${u.email} -> ${role}`);
  res.json({
    token: signJwt(u),
    user: { id: u.id, email: u.email, name: u.name, role: u.role, institution_id: u.institution_id, student_id: u.student_id, api_key: u.api_key, institution: inst },
  });
}));

// Public institution search for onboarding picker
r.get('/institutions-list', (_req, res) => {
  const q = `%${req.query.q || ''}%`;
  const rows = db.prepare('SELECT id, aicte_id, name, state, district FROM institutions WHERE name LIKE ? OR state LIKE ? OR district LIKE ? ORDER BY id LIMIT 15')
    .all(q, q, q);
  res.json(rows);
});

r.get('/me', requireRole(), (req, res) => {
  const u = db.prepare('SELECT id, email, name, role, institution_id, student_id, api_key FROM users WHERE id = ?').get(req.user.id);
  if (!u) return res.status(401).json({ error: 'Session expired' });
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
