import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { db, now } from '../lib/db.js';
import { audit, verifyChain } from '../lib/audit.js';
import { runScan } from '../lib/anomaly.js';
import { explainFlag } from '../lib/ai.js';
import { headroom } from '../lib/validate.js';
import { requireRole, wrap } from '../middleware.js';

const r = Router();
const ADMIN = requireRole('admin', 'regulator');
const latestYear = () => db.prepare('SELECT MAX(admission_year) y FROM students').get().y || new Date().getFullYear();

r.get('/stats/overview', ADMIN, (req, res) => {
  const year = Number(req.query.year) || latestYear();
  const kpi = db.prepare(`SELECT COUNT(*) enrolled, SUM(supernumerary) sup, SUM(nri) nri, SUM(oci) oci, SUM(fn) fn FROM students WHERE status != 'WITHDRAWN' AND admission_year = ?`).get(year);
  const intake = db.prepare('SELECT SUM(approved_intake) t, COUNT(DISTINCT institution_id) i FROM programs').get();
  const flags = db.prepare("SELECT type, COUNT(*) n FROM flags WHERE status = 'open' GROUP BY type").all();
  const byState = db.prepare(`
    SELECT i.state, COUNT(s.id) enrolled, (SELECT SUM(p.approved_intake) FROM programs p JOIN institutions i2 ON i2.id = p.institution_id WHERE i2.state = i.state) intake
    FROM institutions i LEFT JOIN students s ON s.institution_id = i.id AND s.status != 'WITHDRAWN' AND s.admission_year = ?
    GROUP BY i.state ORDER BY enrolled DESC`).all(year);
  const trend = db.prepare(`SELECT admission_year y, COUNT(*) n, SUM(supernumerary) sup FROM students WHERE status != 'WITHDRAWN' GROUP BY admission_year ORDER BY y`).all();
  const byCategory = db.prepare(`SELECT category c, COUNT(*) n FROM students WHERE status != 'WITHDRAWN' AND admission_year = ? GROUP BY category`).all(year);
  const topRisk = db.prepare(`SELECT r.institution_id id, i.name, i.state, r.score, r.reasons, r.fill FROM institution_risk r JOIN institutions i ON i.id = r.institution_id ORDER BY r.score DESC LIMIT 6`).all()
    .map((x) => ({ ...x, reasons: JSON.parse(x.reasons) }));
  const feed = db.prepare('SELECT ts, actor_role, actor_name, action, target FROM audit_log ORDER BY id DESC LIMIT 8').all();
  res.json({ year, kpi, intake: intake.t, institutions: intake.i, flags, byState, trend, byCategory, topRisk, feed, fill: kpi.enrolled / intake.t });
});

r.get('/institutions', ADMIN, (req, res) => {
  const year = Number(req.query.year) || latestYear();
  const q = `%${req.query.q || ''}%`;
  const rows = db.prepare(`
    SELECT i.id, i.aicte_id, i.name, i.state, i.district, i.type, i.last_upload_at,
      (SELECT SUM(approved_intake) FROM programs WHERE institution_id = i.id) intake,
      (SELECT COUNT(*) FROM students s WHERE s.institution_id = i.id AND s.status != 'WITHDRAWN' AND s.admission_year = ?) enrolled,
      (SELECT COUNT(*) FROM flags f WHERE f.institution_id = i.id AND f.status = 'open') open_flags,
      r.score risk
    FROM institutions i LEFT JOIN institution_risk r ON r.institution_id = i.id
    WHERE i.name LIKE ? OR i.state LIKE ? ORDER BY COALESCE(r.score, 0) DESC, i.id`).all(year, q, q);
  res.json({ year, rows });
});

r.get('/institutions/:id', ADMIN, (req, res) => {
  const id = Number(req.params.id);
  const inst = db.prepare('SELECT * FROM institutions WHERE id = ?').get(id);
  if (!inst) return res.status(404).json({ error: 'Not found' });
  const year = Number(req.query.year) || latestYear();
  const risk = db.prepare('SELECT * FROM institution_risk WHERE institution_id = ?').get(id);
  res.json({
    institution: inst, year, headroom: headroom(id, year),
    risk: risk ? { ...risk, reasons: JSON.parse(risk.reasons) } : null,
    flags: db.prepare('SELECT * FROM flags WHERE institution_id = ? ORDER BY id DESC LIMIT 30').all(id),
    uploads: db.prepare('SELECT * FROM uploads WHERE institution_id = ? ORDER BY id DESC LIMIT 8').all(id),
  });
});

// ---- flags ----
r.get('/flags', requireRole('admin', 'regulator', 'institution'), (req, res) => {
  const where = [], args = [];
  if (req.user.role === 'institution') { where.push('f.institution_id = ?'); args.push(req.user.inst); }
  if (req.query.status) { where.push('f.status = ?'); args.push(String(req.query.status)); }
  if (req.query.type) { where.push('f.type = ?'); args.push(String(req.query.type)); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = db.prepare(`SELECT f.*, i.name institution FROM flags f LEFT JOIN institutions i ON i.id = f.institution_id ${w}
    ORDER BY CASE f.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, f.id DESC LIMIT 200`).all(...args);
  res.json(rows.map((f) => ({ ...f, detail: f.detail ? JSON.parse(f.detail) : null })));
});

r.post('/flags/:id/resolve', requireRole('admin'), (req, res) => {
  db.prepare("UPDATE flags SET status = 'resolved', resolved_at = ? WHERE id = ?").run(now(), Number(req.params.id));
  audit(req.user, 'FLAG_RESOLVED', `flag:${req.params.id}`);
  res.json({ ok: true });
});

r.post('/flags/:id/explain', requireRole('admin', 'regulator'), wrap(async (req, res) => {
  const f = db.prepare('SELECT * FROM flags WHERE id = ?').get(Number(req.params.id));
  if (!f) return res.status(404).json({ error: 'Not found' });
  if (f.ai_explanation) return res.json({ text: f.ai_explanation, cached: true });
  const out = await explainFlag(f, f.detail ? JSON.parse(f.detail) : {});
  db.prepare('UPDATE flags SET ai_explanation = ? WHERE id = ?').run(out.text, f.id);
  res.json(out);
}));

r.post('/scan', requireRole('admin'), (req, res) => {
  const out = runScan();
  audit(req.user, 'SCAN_RUN', 'all', out);
  res.json(out);
});

// ---- audit ----
r.get('/audit', requireRole('admin'), (req, res) => {
  const rows = db.prepare('SELECT id, ts, actor_role, actor_name, action, target, meta, hash FROM audit_log ORDER BY id DESC LIMIT ?').all(Math.min(Number(req.query.limit) || 100, 500));
  res.json({ rows, chain: verifyChain() });
});

// ---- reports ----
const REPORTS = {
  'enrolment-by-state': {
    title: 'Enrolment by state', cols: ['State', 'Institutions', 'Approved intake', 'Enrolled', 'Fill %'],
    run: (y) => db.prepare(`SELECT i.state, COUNT(DISTINCT i.id) inst,
      (SELECT SUM(p.approved_intake) FROM programs p JOIN institutions i2 ON i2.id = p.institution_id WHERE i2.state = i.state) intake,
      (SELECT COUNT(*) FROM students s JOIN institutions i3 ON i3.id = s.institution_id WHERE i3.state = i.state AND s.status != 'WITHDRAWN' AND s.admission_year = ?) enrolled
      FROM institutions i GROUP BY i.state ORDER BY enrolled DESC`).all(y).map((x) => [x.state, x.inst, x.intake, x.enrolled, ((x.enrolled / x.intake) * 100).toFixed(1)]),
  },
  'intake-utilisation': {
    title: 'Intake utilisation by institution', cols: ['Institution', 'State', 'Approved intake', 'Enrolled', 'Fill %'],
    run: (y) => db.prepare(`SELECT i.name, i.state, (SELECT SUM(approved_intake) FROM programs WHERE institution_id = i.id) intake,
      (SELECT COUNT(*) FROM students s WHERE s.institution_id = i.id AND s.status != 'WITHDRAWN' AND s.admission_year = ?) enrolled FROM institutions i ORDER BY enrolled * 1.0 / intake DESC`).all(y)
      .map((x) => [x.name, x.state, x.intake, x.enrolled, ((x.enrolled / x.intake) * 100).toFixed(1)]),
  },
  'over-intake': {
    title: 'Programmes exceeding approved intake', cols: ['Institution', 'Programme', 'Year', 'Approved', 'Enrolled', 'Excess'],
    run: () => db.prepare(`SELECT i.name inst, f.message, f.year, f.detail FROM flags f JOIN institutions i ON i.id = f.institution_id WHERE f.type = 'OVER_INTAKE' ORDER BY f.id`).all()
      .map((x) => { const d = JSON.parse(x.detail); return [x.inst, x.message.split(':')[0].replace(/ \(\d+\)$/, ''), x.year, d.intake, d.enrolled, d.excess]; }),
  },
  'special-categories': {
    title: 'Supernumerary, NRI, OCI and FN admissions', cols: ['State', 'Supernumerary', 'NRI', 'OCI', 'Foreign nationals'],
    run: (y) => db.prepare(`SELECT i.state, SUM(s.supernumerary) sup, SUM(s.nri) nri, SUM(s.oci) oci, SUM(s.fn) fn FROM students s JOIN institutions i ON i.id = s.institution_id
      WHERE s.status != 'WITHDRAWN' AND s.admission_year = ? GROUP BY i.state ORDER BY sup DESC`).all(y).map((x) => [x.state, x.sup, x.nri, x.oci, x.fn]),
  },
  'flagged-institutions': {
    title: 'Institutions needing review', cols: ['Institution', 'State', 'Risk score', 'Main reasons'],
    run: () => db.prepare(`SELECT i.name, i.state, r.score, r.reasons FROM institution_risk r JOIN institutions i ON i.id = r.institution_id ORDER BY r.score DESC LIMIT 25`).all()
      .map((x) => [x.name, x.state, (x.score * 100).toFixed(0), JSON.parse(x.reasons).join('; ') || '-']),
  },
};

r.get('/reports', ADMIN, (_req, res) => res.json(Object.entries(REPORTS).map(([id, v]) => ({ id, title: v.title }))));

r.get('/reports/:id', ADMIN, (req, res) => {
  const rep = REPORTS[req.params.id];
  if (!rep) return res.status(404).json({ error: 'Unknown report' });
  const year = Number(req.query.year) || latestYear();
  const rows = rep.run(year);
  audit(req.user, 'REPORT_GENERATED', req.params.id, { format: req.query.format || 'json' });
  const fmt = req.query.format || 'json';
  if (fmt === 'csv') {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    res.set({ 'content-type': 'text/csv', 'content-disposition': `attachment; filename="${req.params.id}-${year}.csv"` });
    return res.send([rep.cols, ...rows].map((r2) => r2.map(esc).join(',')).join('\n'));
  }
  if (fmt === 'pdf') {
    res.set({ 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="${req.params.id}-${year}.pdf"` });
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: rep.cols.length > 5 ? 'landscape' : 'portrait' });
    doc.pipe(res);
    doc.fontSize(18).fillColor('#1a3fa8').text('Praman', { continued: true }).fillColor('#0f1f3d').text(`  ·  ${rep.title}`);
    doc.fontSize(9).fillColor('#4f5e7d').text(`Academic year ${year}  ·  Generated ${new Date().toLocaleString('en-IN')}  ·  Source: Praman central repository (demo data)`).moveDown();
    const w = (doc.page.width - 80) / rep.cols.length;
    const row = (cells, bold) => {
      const y = doc.y;
      cells.forEach((c, i) => doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor('#0f1f3d').text(String(c), 40 + i * w, y, { width: w - 6, height: 24, ellipsis: true }));
      doc.y = y + 18;
      if (doc.y > doc.page.height - 60) doc.addPage();
    };
    row(rep.cols, true);
    rows.forEach((x) => row(x, false));
    return doc.end();
  }
  res.json({ title: rep.title, year, cols: rep.cols, rows });
});

export default r;
