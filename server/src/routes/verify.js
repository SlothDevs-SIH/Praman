import { Router } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { db, now } from '../lib/db.js';
import { apaarHash, decrypt, signToken, verifyToken, publicKeyPem } from '../lib/crypto.js';
import { audit } from '../lib/audit.js';
import { lev } from '../lib/validate.js';
import { requireRole, rateLimit, wrap } from '../middleware.js';

const r = Router();

const STUDENT_SQL = `SELECT s.*, p.name program, p.level, p.duration, i.name institution, i.state, i.aicte_id
  FROM students s JOIN programs p ON p.id = s.program_id JOIN institutions i ON i.id = s.institution_id`;

const maskName = (n) => n.split(' ').map((w) => w[0] + '*'.repeat(Math.max(w.length - 1, 1))).join(' ');
const maskApaar = (id) => `${id.slice(0, 4)} ···· ${id.slice(8)}`;
const sim = (a, b) => {
  const x = a.toLowerCase().replace(/\s+/g, ' ').trim(), y = b.toLowerCase().replace(/\s+/g, ' ').trim();
  return 1 - lev(x, y) / Math.max(x.length, y.length, 1);
};
const frontend = (req) => process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';

// Minimum disclosure by default; richer fields only for roles that need them.
function view(s, level) {
  const base = {
    holder: maskName(s.name), programme: s.program, level: s.level, institution: s.institution, state: s.state,
    admission_year: s.admission_year, expected_completion: s.admission_year + s.duration, status: s.status,
  };
  if (level === 'extended')
    return { ...base, holder: s.name, student_ref: s.student_ref, category: s.category, nri: !!s.nri, oci: !!s.oci, fn: !!s.fn, supernumerary: !!s.supernumerary, aicte_id: s.aicte_id };
  return base;
}

function logVerification(s, user, method, result, purpose) {
  db.prepare('INSERT INTO verifications (student_id, verifier_id, verifier_role, verifier_name, purpose, method, result, created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(s?.id ?? null, user?.id ?? null, user?.role || 'public', user?.name || 'Anonymous (QR scan)', purpose || null, method, result, now());
}

// Authenticated lookup by APAAR ID.
r.post('/verify', requireRole('verifier', 'regulator', 'admin', 'institution'), rateLimit('verify', 60, 60_000), wrap(async (req, res) => {
  const id = String(req.body?.apaar_id || '').replace(/\D/g, '');
  if (id.length !== 12) return res.status(400).json({ error: 'Enter a 12-digit APAAR ID' });
  const rows = db.prepare(`${STUDENT_SQL} WHERE s.apaar_hash = ? ORDER BY CASE s.status WHEN 'ADMITTED' THEN 0 WHEN 'GRADUATED' THEN 1 ELSE 2 END, s.admission_year DESC`).all(apaarHash(id));
  if (!rows.length) {
    logVerification(null, req.user, 'APAAR', 'not_found', req.body?.purpose);
    audit(req.user, 'VERIFY', 'apaar:not_found');
    return res.json({ found: false });
  }
  const s = rows[0];
  if (req.user.role === 'institution' && s.institution_id !== req.user.inst) {
    return res.json({ found: false });   // institutions only see their own students; reveal nothing about others
  }
  const consent = db.prepare('SELECT * FROM consents WHERE student_id = ?').get(s.id);
  if (req.user.role === 'verifier' && !consent?.employers) {
    logVerification(s, req.user, 'APAAR', 'consent_withheld', req.body?.purpose);
    audit(req.user, 'VERIFY', `student:${s.id}`, { result: 'consent_withheld' });
    return res.json({ found: true, consent: false, message: 'The student has not consented to employer verification.' });
  }
  if (req.user.role === 'regulator' && !consent?.regulators) {
    logVerification(s, req.user, 'APAAR', 'consent_withheld', req.body?.purpose);
    return res.json({ found: true, consent: false, message: 'The student has not consented to regulator verification.' });
  }
  const level = ['admin', 'regulator', 'institution'].includes(req.user.role) ? 'extended' : 'basic';
  const nameMatch = req.body?.name ? sim(String(req.body.name), s.name) >= 0.8 : null;
  logVerification(s, req.user, 'APAAR', 'verified', req.body?.purpose);
  audit(req.user, 'VERIFY', `student:${s.id}`, { level });
  res.json({ found: true, consent: true, verified: true, name_match: nameMatch, record: view(s, level), disclosure: level });
}));

// Public check of a signed QR token (no login). Shows minimum disclosure only.
r.get('/public/verify', rateLimit('pub', 40, 60_000), (req, res) => {
  const p = verifyToken(req.query.token);
  if (!p) {
    logVerification(null, null, 'QR', 'invalid_signature');
    return res.json({ authentic: false, message: 'This record could not be verified. It may be forged or altered.' });
  }
  const s = db.prepare(`${STUDENT_SQL} WHERE s.id = ?`).get(p.sid);
  if (!s) return res.json({ authentic: false, message: 'Record no longer exists.' });
  logVerification(s, null, 'QR', 'verified');
  const current = s.status === 'WITHDRAWN' ? 'The student has since withdrawn from this programme.' : null;
  res.json({ authentic: true, issued_at: new Date(p.iat * 1000).toISOString(), notice: current, record: view(s, 'basic') });
});

r.get('/.well-known/praman-key', (_req, res) => res.type('text/plain').send(publicKeyPem));

// ---- verifiable record + certificate ----
function authorizeRecord(req, res) {
  const s = db.prepare(`${STUDENT_SQL} WHERE s.id = ?`).get(Number(req.params.id));
  const u = req.user;
  const ok = s && (u.role === 'admin' || u.role === 'regulator' || (u.role === 'student' && u.stu === s.id) || (u.role === 'institution' && u.inst === s.institution_id));
  if (!ok) { res.status(404).json({ error: 'Record not found' }); return null; }
  return s;
}
const tokenFor = (s) => signToken({ v: 1, sid: s.id, ref: s.student_ref, inst: s.institution_id, prog: s.program, yr: s.admission_year, iat: Math.floor(Date.now() / 1000) });

r.get('/records/:id/token', requireRole('student', 'institution', 'admin', 'regulator'), wrap(async (req, res) => {
  const s = authorizeRecord(req, res);
  if (!s) return;
  const token = tokenFor(s);
  const url = `${frontend(req)}/v/${token}`;
  res.json({ token, url, qr: await QRCode.toDataURL(url, { margin: 1, width: 280, color: { dark: '#0f1f3d' } }) });
}));

async function drawPdf(req, res, s, kind) {
  const token = tokenFor(s);
  const qr = await QRCode.toBuffer(`${frontend(req)}/v/${token}`, { margin: 1, width: 220, color: { dark: '#0f1f3d' } });
  const apaar = decrypt(s.apaar_enc).replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
  res.set({ 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="praman-${kind}-${s.student_ref}.pdf"` });
  const doc = new PDFDocument({ size: 'A4', layout: kind === 'certificate' ? 'landscape' : 'portrait', margin: 50 });
  doc.pipe(res);
  const W = doc.page.width, H = doc.page.height;
  doc.rect(0, 0, W, 8).fill('#1a3fa8');
  doc.rect(20, 20, W - 40, H - 40).lineWidth(1).strokeColor('#d0daef').stroke();
  doc.fillColor('#1a3fa8').font('Helvetica-Bold').fontSize(22).text('Praman', 50, 50);
  doc.fillColor('#4f5e7d').font('Helvetica').fontSize(9).text(kind === 'certificate' ? 'CERTIFICATE OF PROGRAMME COMPLETION (TEMPLATE)' : 'VERIFIABLE STUDENT RECORD', 50, 78);
  doc.fillColor('#0f1f3d').font('Helvetica-Bold').fontSize(kind === 'certificate' ? 26 : 20).text(s.name, 50, 130);
  doc.font('Helvetica').fontSize(12).fillColor('#4f5e7d').text(kind === 'certificate' ? `has successfully completed ${s.program}` : s.program, 50, doc.y + 6);
  doc.text(s.institution + ', ' + s.state);
  const fields = [['Student ID', s.student_ref], ['APAAR ID', apaar], ['Admission year', s.admission_year], ['Status', s.status], ['AICTE institution ID', s.aicte_id]];
  let y = doc.y + 24;
  for (const [k, v] of fields) {
    doc.font('Helvetica').fontSize(10).fillColor('#4f5e7d').text(k, 50, y, { width: 150 });
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f1f3d').text(String(v), 200, y - 1);
    y += 26;
  }
  doc.image(qr, W - 190, kind === 'certificate' ? H - 200 : 110, { width: 120 });
  doc.font('Helvetica').fontSize(8).fillColor('#4f5e7d').text('Scan to verify authenticity', W - 190, (kind === 'certificate' ? H - 200 : 110) + 124, { width: 120, align: 'center' });
  doc.font('Helvetica').fontSize(7).fillColor('#4f5e7d').text(`Digitally signed (Ed25519) · issued ${new Date().toISOString().slice(0, 10)} · public key at /api/.well-known/praman-key`, 50, H - 50, { width: W - 100 });
  doc.end();
}

r.get('/records/:id/pdf', requireRole('student', 'institution', 'admin', 'regulator'), wrap(async (req, res) => {
  const s = authorizeRecord(req, res);
  if (s) { audit(req.user, 'RECORD_PDF', `student:${s.id}`); await drawPdf(req, res, s, 'record'); }
}));
r.get('/certificates/:id/pdf', requireRole('student', 'institution', 'admin', 'regulator'), wrap(async (req, res) => {
  const s = authorizeRecord(req, res);
  if (s) { audit(req.user, 'CERTIFICATE_PDF', `student:${s.id}`); await drawPdf(req, res, s, 'certificate'); }
}));

// ---- student self-service ----
r.get('/student/me', requireRole('student'), (req, res) => {
  const s = db.prepare(`${STUDENT_SQL} WHERE s.id = ?`).get(req.user.stu);
  if (!s) return res.status(404).json({ error: 'No record linked to this account' });
  const { apaar_enc, apaar_hash, ...rest } = s;
  res.json({
    record: { ...rest, apaar_id: decrypt(apaar_enc).replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3'), apaar_masked: maskApaar(decrypt(apaar_enc)) },
    consent: db.prepare('SELECT employers, regulators, extended_fields FROM consents WHERE student_id = ?').get(s.id),
    checks: db.prepare('SELECT verifier_name, verifier_role, method, result, purpose, created_at FROM verifications WHERE student_id = ? ORDER BY id DESC LIMIT 50').all(s.id),
  });
});

r.put('/student/consent', requireRole('student'), (req, res) => {
  const b = req.body || {};
  db.prepare('UPDATE consents SET employers = ?, regulators = ?, extended_fields = ?, updated_at = ? WHERE student_id = ?')
    .run(b.employers ? 1 : 0, b.regulators ? 1 : 0, b.extended_fields ? 1 : 0, now(), req.user.stu);
  audit(req.user, 'CONSENT_UPDATED', `student:${req.user.stu}`, { employers: !!b.employers, regulators: !!b.regulators });
  res.json({ ok: true });
});

export default r;
