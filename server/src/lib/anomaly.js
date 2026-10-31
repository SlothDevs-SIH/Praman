import { db, now, tx } from './db.js';

// ---------- Isolation Forest (seeded, dependency-free) ----------
function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const c = (n) => (n <= 1 ? 0 : 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n);

function buildTree(rows, depth, maxDepth, rnd) {
  if (depth >= maxDepth || rows.length <= 1) return { size: rows.length };
  const dims = rows[0].length;
  const q = Math.floor(rnd() * dims);
  const vals = rows.map((r) => r[q]);
  const min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) return { size: rows.length };
  const p = min + rnd() * (max - min);
  return {
    q, p,
    left: buildTree(rows.filter((r) => r[q] < p), depth + 1, maxDepth, rnd),
    right: buildTree(rows.filter((r) => r[q] >= p), depth + 1, maxDepth, rnd),
  };
}
const pathLen = (t, r, d = 0) => (t.size !== undefined ? d + c(t.size) : pathLen(r[t.q] < t.p ? t.left : t.right, r, d + 1));

export function isolationScores(X, trees = 100, sample = 128) {
  const rnd = mulberry(42);
  const psi = Math.min(sample, X.length);
  const maxDepth = Math.ceil(Math.log2(Math.max(psi, 2)));
  const forest = [];
  for (let i = 0; i < trees; i++) {
    const s = [];
    for (let j = 0; j < psi; j++) s.push(X[Math.floor(rnd() * X.length)]);
    forest.push(buildTree(s, 0, maxDepth, rnd));
  }
  return X.map((r) => 2 ** (-(forest.reduce((a, t) => a + pathLen(t, r), 0) / trees) / c(psi)));
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; };
const mad = (a, m) => median(a.map((x) => Math.abs(x - m))) || 1e-6;

const FEATURES = [
  ['fill', 'seat fill ratio'],
  ['superShare', 'supernumerary share'],
  ['nriShare', 'NRI share'],
  ['fnShare', 'foreign-national share'],
  ['growth', 'year-on-year enrolment growth'],
  ['dupRate', 'cross-institution duplicate rate'],
];

// ---------- scan: recompute risk + flags for every institution ----------
export function runScan() {
  const latest = db.prepare('SELECT MAX(admission_year) y FROM students').get().y || new Date().getFullYear();
  const insts = db.prepare('SELECT id, name FROM institutions').all();
  const stats = db.prepare(`
    SELECT institution_id, admission_year,
      SUM(CASE WHEN status != 'WITHDRAWN' AND supernumerary = 0 THEN 1 ELSE 0 END) reg,
      SUM(CASE WHEN status != 'WITHDRAWN' AND supernumerary = 1 THEN 1 ELSE 0 END) sup,
      SUM(CASE WHEN status != 'WITHDRAWN' THEN nri ELSE 0 END) nri,
      SUM(CASE WHEN status != 'WITHDRAWN' THEN fn ELSE 0 END) fn
    FROM students GROUP BY institution_id, admission_year`).all();
  const byInst = new Map();
  for (const s of stats) {
    if (!byInst.has(s.institution_id)) byInst.set(s.institution_id, new Map());
    byInst.get(s.institution_id).set(s.admission_year, s);
  }
  const intakeByInst = new Map(db.prepare('SELECT institution_id, SUM(approved_intake) t FROM programs GROUP BY institution_id').all().map((r) => [r.institution_id, r.t]));

  // Ensure cross-institution duplicate APAAR enrolments have handshakes + CROSS_DUP flags
  const tsScan = now();
  const crossPairs = db.prepare(`
    SELECT s1.id sid_a, s2.id sid_b, s1.institution_id inst_a, s2.institution_id inst_b, s1.apaar_hash, s1.admission_year y, s1.name
    FROM students s1
    JOIN students s2 ON s1.apaar_hash = s2.apaar_hash AND s1.id < s2.id AND s1.institution_id != s2.institution_id
    WHERE s1.status = 'ADMITTED' AND s2.status = 'ADMITTED' AND s1.admission_year = s2.admission_year
  `).all();
  tx(() => {
    for (const cp of crossPairs) {
      const exists = db.prepare('SELECT id FROM handshakes WHERE (student_a = ? AND student_b = ?) OR (student_a = ? AND student_b = ?)').get(cp.sid_a, cp.sid_b, cp.sid_b, cp.sid_a);
      if (!exists) {
        db.prepare('INSERT INTO handshakes (apaar_hash, student_a, student_b, inst_a, inst_b, created_at) VALUES (?,?,?,?,?,?)')
          .run(cp.apaar_hash, cp.sid_a, cp.sid_b, cp.inst_a, cp.inst_b, tsScan);
      }
      db.prepare('INSERT OR IGNORE INTO flags (type, severity, institution_id, student_id, year, message, dedupe_key, created_at) VALUES (?,?,?,?,?,?,?,?)')
        .run('CROSS_DUP', 'medium', cp.inst_b, cp.sid_b, cp.y, `Possible duplicate enrolment across institutions (${cp.name})`, `dup:${cp.sid_a}:${cp.sid_b}`, tsScan);
    }
  });

  const dups = new Map(db.prepare("SELECT institution_id, COUNT(*) n FROM flags WHERE type = 'CROSS_DUP' GROUP BY institution_id").all().map((r) => [r.institution_id, r.n]));

  const feats = [];
  for (const i of insts) {
    const years = byInst.get(i.id);
    const cur = years?.get(latest);
    const prev = years?.get(latest - 1);
    const intake = intakeByInst.get(i.id) || 0;
    if (!cur || !intake) continue;
    const enrolled = cur.reg + cur.sup;
    feats.push({
      id: i.id, enrolled, intake, reg: cur.reg,
      v: [cur.reg / intake, cur.sup / Math.max(enrolled, 1), cur.nri / Math.max(enrolled, 1), cur.fn / Math.max(enrolled, 1),
        prev ? (enrolled - (prev.reg + prev.sup)) / Math.max(prev.reg + prev.sup, 1) : 0, (dups.get(i.id) || 0) / Math.max(enrolled, 1)],
    });
  }
  if (feats.length < 10) return { scanned: feats.length, flagged: 0 };

  const X = feats.map((f) => f.v);
  const scores = isolationScores(X);
  const med = FEATURES.map((_, k) => median(X.map((r) => r[k])));
  const dev = FEATURES.map((_, k) => mad(X.map((r) => r[k]), med[k]));
  const ts = now();
  let flagged = 0;

  tx(() => {
    db.prepare('DELETE FROM institution_risk').run();
    // Replace auto-generated open flags; analyst-resolved ones keep their status through dedupe keys.
    for (let n = 0; n < feats.length; n++) {
      const f = feats[n];
      const reasons = FEATURES
        .map(([, label], k) => ({ label, z: (f.v[k] - med[k]) / (1.4826 * dev[k]), val: f.v[k] }))
        .filter((r) => Math.abs(r.z) > 3)
        .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
        .slice(0, 3)
        .map((r) => `${r.label} ${(r.val * 100).toFixed(0)}% (${r.z > 0 ? 'far above' : 'far below'} peers)`);
      const score = scores[n];
      const fill = f.v[0];
      db.prepare('INSERT INTO institution_risk VALUES (?,?,?,?,?,?,?)').run(f.id, score, JSON.stringify(reasons), fill, f.enrolled, f.intake, ts);

      if (score > 0.6 && reasons.length) {
        db.prepare('INSERT INTO flags (type, severity, institution_id, year, message, detail, dedupe_key, created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(dedupe_key) DO UPDATE SET detail = excluded.detail, message = excluded.message')
          .run('ANOMALY', score > 0.7 ? 'high' : 'medium', f.id, latest, `Unusual enrolment pattern (risk ${(score * 100).toFixed(0)}/100)`, JSON.stringify({ reasons, score }), `anom:${f.id}:${latest}`, ts);
        flagged++;
      }
    }
    // Programme-level over-intake
    const over = db.prepare(`
      SELECT p.id pid, p.institution_id iid, p.name, p.approved_intake, p.super_cap, s.admission_year y,
        SUM(CASE WHEN s.supernumerary = 0 THEN 1 ELSE 0 END) reg, SUM(CASE WHEN s.supernumerary = 1 THEN 1 ELSE 0 END) sup
      FROM programs p JOIN students s ON s.program_id = p.id AND s.status != 'WITHDRAWN'
      GROUP BY p.id, s.admission_year HAVING reg > p.approved_intake OR sup > p.super_cap`).all();
    for (const o of over) {
      const excess = o.reg > o.approved_intake ? o.reg - o.approved_intake : o.sup - o.super_cap;
      db.prepare('INSERT INTO flags (type, severity, institution_id, program_id, year, message, detail, dedupe_key, created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(dedupe_key) DO UPDATE SET detail = excluded.detail, message = excluded.message')
        .run('OVER_INTAKE', excess > o.approved_intake * 0.1 ? 'high' : 'medium', o.iid, o.pid, o.y,
          `${o.name} (${o.y}): ${o.reg} enrolled against approved intake ${o.approved_intake}`,
          JSON.stringify({ enrolled: o.reg, intake: o.approved_intake, excess }), `over:${o.pid}:${o.y}`, ts);
    }
  });
  return { scanned: feats.length, flagged };
}
