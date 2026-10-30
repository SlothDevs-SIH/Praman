import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { db, now } from '../lib/db.js';
import { decrypt } from '../lib/crypto.js';
import { audit } from '../lib/audit.js';
import { processRows, commitResults, headroom } from '../lib/validate.js';
import { notifyInstitution } from '../lib/notify.js';
import { requireRole, wrap } from '../middleware.js';

const r = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const CURRENT_YEAR = new Date().getFullYear();

// Admins may act on any institution via ?institution=ID; institution users are pinned to their own.
const scope = (req) => (req.user.role === 'institution' ? req.user.inst : Number(req.query.institution || req.body?.institution_id) || null);

function readRows(req) {
  if (req.file) {
    const text = req.file.buffer.toString('utf8').replace(/^﻿/, '');
    return parse(text, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
  }
  if (Array.isArray(req.body?.rows)) return req.body.rows;
  throw Object.assign(new Error('Send a CSV file (field "file") or JSON {"rows": [...]}'), { status: 400 });
}

const slim = (p) => ({
  summary: p.summary, headroom: p.headroom,
  rows: p.results.map((x) => ({
    line: x.line, status: x.status, accepted: x.accepted, fixes: x.fixes, issues: x.issues,
    name: x.data.name, apaar_id: x.data.apaar_id ? x.data.apaar_id.replace(/^(\d{4})\d{4}(\d{4})$/, '$1 ···· $2') : '',
    student_ref: x.data.student_ref, program: x.data.program?.name,
  })),
});

// Pre-flight: validate + autocorrect without saving anything.
r.post('/uploads/preview', requireRole('institution', 'admin'), upload.single('file'), wrap(async (req, res) => {
  const iid = scope(req);
  if (!iid) return res.status(400).json({ error: 'institution is required' });
  res.json(slim(processRows(iid, readRows(req))));
}));

// Commit: re-validates and stores every row that passed. Rows with errors are rejected.
r.post('/uploads/commit', requireRole('institution', 'admin'), upload.single('file'), wrap(async (req, res) => {
  const iid = scope(req);
  if (!iid) return res.status(400).json({ error: 'institution is required' });
  const processed = processRows(iid, readRows(req));
  const out = await commitResults(req.user, iid, req.file?.originalname || req.body?.filename || 'api', processed);
  audit(req.user, 'UPLOAD', `institution:${iid}`, { ...processed.summary, ...out });
  res.json({ ...out, ...slim(processed) });
}));

// Single-record create/update, same pipeline, handy for ERP integrations.
r.post('/students', requireRole('institution', 'admin'), wrap(async (req, res) => {
  const iid = scope(req);
  const p = processRows(iid, [req.body]);
  const out = p.results[0].accepted ? await commitResults(req.user, iid, 'api:single', p) : { accepted: 0 };
  audit(req.user, 'STUDENT_UPSERT', `institution:${iid}`, { status: p.results[0].status });
  res.status(p.results[0].accepted ? 200 : 422).json({ ...out, ...slim(p) });
}));

r.get('/dashboard', requireRole('institution'), (req, res) => {
  const iid = req.user.inst;
  const year = Number(req.query.year) || CURRENT_YEAR;
  const inst = db.prepare('SELECT * FROM institutions WHERE id = ?').get(iid);
  const hr = headroom(iid, year);
  const days = inst.last_upload_at ? Math.floor((Date.now() - new Date(inst.last_upload_at)) / 86400000) : null;
  const totals = db.prepare(`SELECT COUNT(*) total, SUM(supernumerary) sup, SUM(nri) nri, SUM(oci) oci, SUM(fn) fn FROM students WHERE institution_id = ? AND status != 'WITHDRAWN' AND admission_year = ?`).get(iid, year);
  const byYear = db.prepare(`SELECT admission_year y, COUNT(*) n FROM students WHERE institution_id = ? AND status != 'WITHDRAWN' GROUP BY admission_year ORDER BY y`).all(iid);
  res.json({
    institution: inst, year, headroom: hr, totals, byYear,
    freshness: { days, level: days === null ? 'red' : days <= 30 ? 'green' : days <= 90 ? 'amber' : 'red' },
    flags: db.prepare("SELECT id, type, severity, message, status, created_at FROM flags WHERE institution_id = ? AND status = 'open' ORDER BY id DESC LIMIT 20").all(iid),
    uploads: db.prepare('SELECT * FROM uploads WHERE institution_id = ? ORDER BY id DESC LIMIT 8').all(iid),
    pendingHandshakes: db.prepare("SELECT COUNT(*) n FROM handshakes WHERE status = 'pending' AND (inst_a = ? OR inst_b = ?)").get(iid, iid).n,
  });
});

r.get('/students', requireRole('institution', 'admin', 'regulator'), (req, res) => {
  const iid = req.user.role === 'institution' ? req.user.inst : Number(req.query.institution) || null;
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = 25;
  const where = [], args = [];
  if (iid) { where.push('s.institution_id = ?'); args.push(iid); }
  if (req.query.program) { where.push('s.program_id = ?'); args.push(Number(req.query.program)); }
  if (req.query.year) { where.push('s.admission_year = ?'); args.push(Number(req.query.year)); }
  if (req.query.status) { where.push('s.status = ?'); args.push(String(req.query.status)); }
  if (req.query.q) { where.push('(s.name LIKE ? OR s.student_ref LIKE ?)'); args.push(`%${req.query.q}%`, `%${req.query.q}%`); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) c FROM students s ${w}`).get(...args).c;
  const rows = db.prepare(`SELECT s.id, s.apaar_enc, s.student_ref, s.name, s.category, s.nri, s.oci, s.fn, s.supernumerary, s.admission_year, s.status, s.updated_at, p.name program, i.name institution
    FROM students s JOIN programs p ON p.id = s.program_id JOIN institutions i ON i.id = s.institution_id ${w} ORDER BY s.id DESC LIMIT ? OFFSET ?`).all(...args, size, (page - 1) * size);
  const mask = req.user.role === 'regulator';
  res.json({
    total, page, pages: Math.ceil(total / size),
    rows: rows.map(({ apaar_enc, ...x }) => {
      const id = decrypt(apaar_enc);
      return { ...x, apaar_id: mask ? `${id.slice(0, 4)} ···· ${id.slice(8)}` : id.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') };
    }),
  });
});

r.get('/programs', requireRole('institution', 'admin'), (req, res) => {
  const iid = scope(req);
  res.json(db.prepare('SELECT * FROM programs WHERE institution_id = ? ORDER BY name').all(iid));
});

// ---- inbox + duplicate-enrolment handshakes ----
r.get('/inbox', requireRole('institution'), (req, res) => {
  const iid = req.user.inst;
  const handshakes = db.prepare(`
    SELECT h.id, h.status, h.resolution, h.created_at, h.inst_a, h.inst_b,
      CASE WHEN h.inst_a = ? THEN h.student_a ELSE h.student_b END my_student
    FROM handshakes h WHERE h.inst_a = ? OR h.inst_b = ? ORDER BY h.id DESC LIMIT 100`).all(iid, iid, iid)
    .map((h) => {
      const s = db.prepare('SELECT s.name, s.student_ref, s.admission_year, p.name program FROM students s JOIN programs p ON p.id = s.program_id WHERE s.id = ?').get(h.my_student);
      return { id: h.id, status: h.status, resolution: h.resolution, created_at: h.created_at, student: s };
    });
  res.json({ handshakes, notifications: db.prepare('SELECT * FROM notifications WHERE institution_id = ? ORDER BY id DESC LIMIT 50').all(iid) });
});

r.post('/handshakes/:id/respond', requireRole('institution'), wrap(async (req, res) => {
  const iid = req.user.inst;
  const h = db.prepare('SELECT * FROM handshakes WHERE id = ? AND (inst_a = ? OR inst_b = ?)').get(Number(req.params.id), iid, iid);
  if (!h) return res.status(404).json({ error: 'Not found' });
  const action = req.body?.action;
  if (!['WITHDRAWN', 'TRANSFERRED', 'DISPUTE'].includes(action)) return res.status(400).json({ error: 'action must be WITHDRAWN, TRANSFERRED or DISPUTE' });
  const myStudent = h.inst_a === iid ? h.student_a : h.student_b;
  if (action !== 'DISPUTE') db.prepare("UPDATE students SET status = 'WITHDRAWN', updated_at = ? WHERE id = ?").run(now(), myStudent);
  const status = action === 'DISPUTE' ? 'disputed' : 'resolved';
  db.prepare('UPDATE handshakes SET status = ?, resolution = ?, resolved_at = ? WHERE id = ?').run(status, `${action} by institution ${iid}`, now(), h.id);
  if (action !== 'DISPUTE') db.prepare("UPDATE flags SET status = 'resolved', resolved_at = ? WHERE type = 'CROSS_DUP' AND student_id IN (?, ?)").run(now(), h.student_a, h.student_b);
  audit(req.user, 'HANDSHAKE_' + action, `handshake:${h.id}`);
  const other = h.inst_a === iid ? h.inst_b : h.inst_a;
  await notifyInstitution(other, 'Duplicate enrolment update', `The other institution marked the case as ${action.toLowerCase()}.`, '/inbox');
  res.json({ ok: true, status });
}));

r.post('/notifications/read', requireRole('institution'), (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE institution_id = ?').run(req.user.inst);
  res.json({ ok: true });
});

r.put('/webhook', requireRole('institution'), (req, res) => {
  const url = String(req.body?.url || '');
  if (url && !/^https:\/\//.test(url)) return res.status(400).json({ error: 'Webhook URL must use https' });
  db.prepare('UPDATE institutions SET webhook_url = ? WHERE id = ?').run(url || null, req.user.inst);
  audit(req.user, 'WEBHOOK_SET', `institution:${req.user.inst}`);
  res.json({ ok: true });
});

export default r;
