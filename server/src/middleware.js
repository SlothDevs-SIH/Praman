import jwt from 'jsonwebtoken';
import { jwtSecret } from './lib/crypto.js';
import { db } from './lib/db.js';

export const signJwt = (u) =>
  jwt.sign({ id: u.id, role: u.role, name: u.name, inst: u.institution_id, stu: u.student_id }, jwtSecret, { expiresIn: '12h' });

// Accepts a bearer token (browser) or an x-api-key header (institution ERP integrations).
export function authenticate(req, _res, next) {
  const h = req.headers.authorization;
  try {
    if (h?.startsWith('Bearer ')) {
      const p = jwt.verify(h.slice(7), jwtSecret);
      req.user = { id: p.id, role: p.role, name: p.name, inst: p.inst, stu: p.stu };
    } else if (req.headers['x-api-key']) {
      const u = db.prepare('SELECT * FROM users WHERE api_key = ?').get(String(req.headers['x-api-key']));
      if (u) req.user = { id: u.id, role: u.role, name: u.name, inst: u.institution_id, stu: u.student_id, viaKey: true };
    }
  } catch {
    /* invalid token: treated as anonymous */
  }
  next();
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'Not permitted for your role' });
  next();
};

// Tiny in-memory rate limiter (per IP + bucket).
const hits = new Map();
export const rateLimit = (bucket, max, windowMs) => (req, res, next) => {
  const k = `${bucket}:${req.ip}`;
  const t = Date.now();
  const arr = (hits.get(k) || []).filter((x) => t - x < windowMs);
  if (arr.length >= max) return res.status(429).json({ error: 'Too many requests. Please wait and retry.' });
  arr.push(t);
  hits.set(k, arr);
  next();
};

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
