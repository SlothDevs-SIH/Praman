import { db, now, tx } from './db.js';
import { apaarHash, encrypt } from './crypto.js';
import { verhoeffValid } from './verhoeff.js';
import { notifyInstitution } from './notify.js';

const CURRENT_YEAR = new Date().getFullYear();

// ---------- normalisers (the "autocorrect" layer) ----------
const squash = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const key = (s) => squash(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const HEADERS = {
  apaar_id: ['apaar', 'apaarid', 'apaarno', 'apaarnumber'],
  student_ref: ['studentid', 'student_id', 'studentref', 'rollno', 'roll', 'enrollmentno', 'enrolmentno', 'regno', 'registrationno'],
  name: ['name', 'studentname', 'fullname'],
  dob: ['dob', 'dateofbirth', 'birthdate'],
  gender: ['gender', 'sex'],
  category: ['category', 'caste', 'reservationcategory'],
  nri: ['nri', 'nricategory', 'nristatus'],
  oci: ['oci', 'ocistatus'],
  fn: ['fn', 'foreignnational', 'fnstatus'],
  supernumerary: ['supernumerary', 'supernumeraryseat', 'supernumeraryseats'],
  program: ['program', 'programme', 'course', 'branch', 'programname'],
  admission_year: ['admissionyear', 'year', 'academicyear', 'batch'],
  email: ['email', 'emailid'],
  phone: ['phone', 'mobile', 'phoneno', 'mobileno'],
  status: ['status', 'studentstatus'],
};
const headerLookup = {};
for (const [canon, aliases] of Object.entries(HEADERS)) {
  headerLookup[key(canon)] = canon;
  for (const a of aliases) headerLookup[key(a)] = canon;
}
export function canonicalizeRow(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const c = headerLookup[key(k)];
    if (c) out[c] = v;
  }
  return out;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const iso = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
    ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    : null;
};
export function normDate(v) {
  const s = squash(v);
  if (!s) return null;
  let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) return iso(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) return iso(+m[3], +m[2], +m[1]);
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/))) return iso(+m[3] > 26 ? 1900 + +m[3] : 2000 + +m[3], +m[2], +m[1]);
  if ((m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3})[a-z]*[ -,]*(\d{4})$/))) {
    const mi = MONTHS.indexOf(m[2].toLowerCase());
    return mi >= 0 ? iso(+m[3], mi + 1, +m[1]) : null;
  }
  return null;
}
const TRUE = new Set(['y', 'yes', 'true', '1', 't', 'x']);
const FALSE = new Set(['n', 'no', 'false', '0', 'f', '', 'na', 'nil', 'none']);
export function normBool(v) {
  const s = squash(v).toLowerCase();
  if (TRUE.has(s)) return 1;
  if (FALSE.has(s)) return 0;
  return null;
}
const CATS = { gen: 'GENERAL', general: 'GENERAL', ur: 'GENERAL', open: 'GENERAL', unreserved: 'GENERAL', obc: 'OBC', obcncl: 'OBC', sc: 'SC', st: 'ST', ews: 'EWS' };
const normCategory = (v) => CATS[key(v)] || null;
const normGender = (v) => ({ m: 'M', male: 'M', f: 'F', female: 'F', o: 'O', other: 'O', t: 'O', transgender: 'O' })[key(v)] || null;
const STATUSES = { admitted: 'ADMITTED', active: 'ADMITTED', enrolled: 'ADMITTED', '': 'ADMITTED', withdrawn: 'WITHDRAWN', cancelled: 'WITHDRAWN', graduated: 'GRADUATED', passed: 'GRADUATED' };
const normStatus = (v) => STATUSES[key(v)] ?? null;
const titleCase = (s) => squash(s).toLowerCase().replace(/(^|[\s.'-])([a-z])/g, (_, a, b) => a + b.toUpperCase());

export function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const nameSim = (a, b) => {
  const x = squash(a).toLowerCase().split(' ').sort().join(' ');
  const y = squash(b).toLowerCase().split(' ').sort().join(' ');
  return 1 - lev(x, y) / Math.max(x.length, y.length, 1);
};

const registryGet = db.prepare('SELECT name, dob FROM apaar_registry WHERE apaar_hash = ?');
const inRegistry = (id) => registryGet.get(apaarHash(id));

// Suggest the nearest registered APAAR ID (single substitution or adjacent swap that is also checksum-valid).
function suggestApaar(digits) {
  const found = new Set();
  const tryId = (c) => {
    if (c !== digits && verhoeffValid(c) && inRegistry(c)) found.add(c);
  };
  for (let i = 0; i < digits.length; i++) {
    for (let d = 0; d < 10; d++) tryId(digits.slice(0, i) + d + digits.slice(i + 1));
    if (i < digits.length - 1) tryId(digits.slice(0, i) + digits[i + 1] + digits[i] + digits.slice(i + 2));
  }
  return found.size === 1 ? [...found][0] : null;
}

// ---------- seat accounting ----------
export function seatUsage(institutionId) {
  const rows = db
    .prepare(
      `SELECT program_id, admission_year, supernumerary, COUNT(*) c FROM students
       WHERE institution_id = ? AND status != 'WITHDRAWN' GROUP BY program_id, admission_year, supernumerary`,
    )
    .all(institutionId);
  const usage = new Map();
  for (const r of rows) {
    const k = `${r.program_id}:${r.admission_year}`;
    const u = usage.get(k) || { reg: 0, sup: 0 };
    if (r.supernumerary) u.sup += r.c;
    else u.reg += r.c;
    usage.set(k, u);
  }
  return usage;
}

export function headroom(institutionId, year) {
  const usage = seatUsage(institutionId);
  return db
    .prepare('SELECT * FROM programs WHERE institution_id = ? ORDER BY name')
    .all(institutionId)
    .map((p) => {
      const u = usage.get(`${p.id}:${year}`) || { reg: 0, sup: 0 };
      return {
        program_id: p.id, name: p.name, year, intake: p.approved_intake, super_cap: p.super_cap,
        regular_used: u.reg, super_used: u.sup, headroom: p.approved_intake - u.reg, super_headroom: p.super_cap - u.sup,
      };
    });
}

// ---------- the pipeline ----------
export function processRows(institutionId, rawRows) {
  const programs = db.prepare('SELECT * FROM programs WHERE institution_id = ?').all(institutionId);
  const progByKey = new Map(programs.map((p) => [key(p.name), p]));
  const usage = seatUsage(institutionId);
  const touched = new Set();
  const seenInFile = new Map();
  const results = [];

  rawRows.forEach((raw, idx) => {
    const input = canonicalizeRow(raw);
    const fixes = [];
    const issues = [];
    const err = (code, field, message) => issues.push({ severity: 'error', code, field, message });
    const warn = (code, field, message) => issues.push({ severity: 'warning', code, field, message });
    const fix = (field, from, to, why) => {
      if (String(from ?? '') !== String(to ?? '')) fixes.push({ field, from: from ?? '', to: to ?? '', why });
    };
    const d = {};

    // APAAR ID
    const rawApaar = input.apaar_id;
    let digits = squash(rawApaar).replace(/[\s-]/g, '');
    if (digits !== squash(rawApaar) && digits) fix('apaar_id', rawApaar, digits, 'Removed spaces/hyphens');
    if (!digits) err('MISSING_APAAR', 'apaar_id', 'APAAR ID is missing');
    else if (!/^\d{12}$/.test(digits)) err('INVALID_APAAR', 'apaar_id', 'APAAR ID must be exactly 12 digits');
    else {
      let reg = verhoeffValid(digits) ? inRegistry(digits) : null;
      if (!reg) {
        const s = suggestApaar(digits);
        if (s) {
          fix('apaar_id', digits, s, 'Closest registered APAAR ID (probable typo)');
          digits = s;
          reg = inRegistry(s);
        } else if (!verhoeffValid(digits)) err('INVALID_APAAR', 'apaar_id', 'APAAR ID fails the checksum');
        else err('APAAR_NOT_FOUND', 'apaar_id', 'APAAR ID is not present in the national registry');
      }
      d.apaar_id = digits;
      d.registry = reg;
    }

    // Name / DOB
    const name = titleCase(input.name);
    if (!name) err('MISSING_NAME', 'name', 'Student name is missing');
    else fix('name', input.name, name, 'Normalised capitalisation and spacing');
    d.name = name;
    const dob = normDate(input.dob);
    if (!squash(input.dob)) err('MISSING_DOB', 'dob', 'Date of birth is missing');
    else if (!dob) err('BAD_DOB', 'dob', `Could not read date of birth "${input.dob}"`);
    else fix('dob', input.dob, dob, 'Converted to YYYY-MM-DD');
    d.dob = dob;

    if (d.registry && !issues.some((i) => i.severity === 'error')) {
      if (dob && d.registry.dob !== dob) err('DOB_MISMATCH', 'dob', 'Date of birth does not match the APAAR registry');
      else if (name && nameSim(name, d.registry.name) < 0.7) warn('NAME_MISMATCH', 'name', 'Name differs noticeably from the APAAR registry record');
    }

    // Simple fields
    const gender = normGender(input.gender);
    if (squash(input.gender) && !gender) warn('BAD_GENDER', 'gender', `Unrecognised gender "${input.gender}"`);
    d.gender = gender;

    const nri = normBool(input.nri), oci = normBool(input.oci), fn = normBool(input.fn), sup = normBool(input.supernumerary);
    for (const [f, v] of [['nri', nri], ['oci', oci], ['fn', fn], ['supernumerary', sup]]) {
      if (v === null) err('BAD_FLAG', f, `${f.toUpperCase()} must be Yes/No`);
    }
    d.nri = nri || 0; d.oci = oci || 0; d.fn = fn || 0; d.supernumerary = sup || 0;

    const cat = normCategory(input.category);
    if (!squash(input.category)) {
      if (!d.fn) err('MISSING_CATEGORY', 'category', 'Category is missing');
    } else if (!cat) err('BAD_CATEGORY', 'category', `Unrecognised category "${input.category}"`);
    else fix('category', input.category, cat, 'Standardised category');
    d.category = cat;

    if (!squash(input.student_ref)) err('MISSING_STUDENT_ID', 'student_ref', 'Institution student ID / roll number is missing');
    d.student_ref = squash(input.student_ref);
    d.email = squash(input.email).toLowerCase() || null;
    const phone = squash(input.phone).replace(/\D/g, '').slice(-10);
    d.phone = phone || null;
    const status = normStatus(input.status);
    if (!status) err('BAD_STATUS', 'status', `Unknown status "${input.status}"`);
    d.status = status || 'ADMITTED';

    // Programme (with fuzzy match)
    let prog = progByKey.get(key(input.program));
    if (!squash(input.program)) err('MISSING_PROGRAM', 'program', 'Programme is missing');
    else if (!prog) {
      let best = null, bd = 99;
      for (const p of programs) {
        const dist = lev(key(input.program), key(p.name));
        if (dist < bd) { bd = dist; best = p; }
      }
      if (best && bd <= 2) {
        prog = best;
        fix('program', input.program, best.name, 'Matched to your approved programme');
      } else err('UNKNOWN_PROGRAM', 'program', `"${input.program}" is not an approved programme of this institution`);
    }
    d.program = prog;

    const year = parseInt(String(input.admission_year).slice(0, 4), 10);
    if (!(year >= 2015 && year <= CURRENT_YEAR + 1)) err('BAD_YEAR', 'admission_year', `Invalid admission year "${input.admission_year}"`);
    d.admission_year = year;

    // Consistency rules
    if (d.fn && d.oci) err('INCONSISTENT', 'oci', 'A student cannot be both Foreign National and OCI');
    if (d.fn && d.nri) err('INCONSISTENT', 'nri', 'A Foreign National cannot also be flagged NRI');
    if (d.oci && d.nri) warn('CHECK_NRI_OCI', 'nri', 'Student is flagged both OCI and NRI. Please confirm.');
    if (d.supernumerary && !(d.fn || d.oci)) err('SUPERNUMERARY_INVALID', 'supernumerary', 'Supernumerary seats are only for FN/OCI students');
    if (dob && prog && year) {
      const age = year - parseInt(dob.slice(0, 4), 10);
      const [lo, hi] = prog.level === 'PG' ? [20, 50] : [15, 35];
      if (age < lo || age > hi) warn('AGE_OUT_OF_RANGE', 'dob', `Age at admission (${age}) is unusual for a ${prog.level || 'UG'} programme`);
    }

    // Duplicates & enrolment checks (only on otherwise-valid APAAR)
    let existingId = null;
    if (d.apaar_id && !issues.some((i) => i.field === 'apaar_id' && i.severity === 'error')) {
      const h = apaarHash(d.apaar_id);
      d.hash = h;
      const fileKey = `${h}`;
      if (seenInFile.has(fileKey)) err('DUPLICATE_IN_FILE', 'apaar_id', `Duplicate of row ${seenInFile.get(fileKey)} in this file`);
      else seenInFile.set(fileKey, idx + 2);

      const mine = db.prepare('SELECT s.id, s.program_id, s.admission_year, s.status, s.supernumerary, p.duration FROM students s JOIN programs p ON p.id = s.program_id WHERE s.apaar_hash = ? AND s.institution_id = ?').all(h, institutionId);
      for (const m of mine) {
        if (prog && m.program_id === prog.id && m.admission_year === year) existingId = m.id;
        else if (m.status === 'ADMITTED' && d.status === 'ADMITTED' && Math.abs(m.admission_year - year) < m.duration)
          err('DUPLICATE_IN_INSTITUTION', 'apaar_id', 'This student is already enrolled in another programme at your institution');
      }
      const others = db.prepare('SELECT s.id, s.institution_id, s.admission_year, p.duration FROM students s JOIN programs p ON p.id = s.program_id WHERE s.apaar_hash = ? AND s.institution_id != ? AND s.status = \'ADMITTED\'').all(h, institutionId);
      for (const o of others) {
        if (d.status === 'ADMITTED' && Math.abs(o.admission_year - year) < o.duration) {
          d.crossDup = o;
          warn('CROSS_DUP', 'apaar_id', 'This APAAR ID is already active at another institution. A confirmation request will be sent to both.');
          break;
        }
      }
    }
    d.existingId = existingId;

    // Intake
    if (prog && year && !issues.some((i) => i.severity === 'error') && d.status !== 'WITHDRAWN') {
      const k = `${prog.id}:${year}`;
      const u = usage.get(k) || { reg: 0, sup: 0 };
      if (existingId) {
        const old = db.prepare('SELECT supernumerary, status FROM students WHERE id = ?').get(existingId);
        if (old.status !== 'WITHDRAWN') {
          if (old.supernumerary) u.sup--; else u.reg--;
        }
      }
      if (d.supernumerary ? u.sup + 1 > prog.super_cap : u.reg + 1 > prog.approved_intake)
        err('OVER_INTAKE', 'program', d.supernumerary
          ? `Supernumerary cap of ${prog.super_cap} for ${prog.name} (${year}) is already full`
          : `Approved intake of ${prog.approved_intake} for ${prog.name} (${year}) is already full`);
      else {
        if (d.supernumerary) u.sup++; else u.reg++;
        touched.add(k);
      }
      usage.set(k, u);
    }

    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');
    results.push({
      line: idx + 2, input: raw, data: d, fixes, issues,
      status: errors.length ? 'error' : warnings.length ? 'warning' : fixes.length ? 'fixed' : 'ok',
      accepted: !errors.length,
    });
  });

  const count = (s) => results.filter((r) => r.status === s).length;
  const years = [...new Set(results.map((r) => r.data.admission_year).filter(Boolean))];
  return {
    results,
    summary: {
      total: results.length, ok: count('ok'), fixed: count('fixed'), warning: count('warning'), error: count('error'),
      autofixes: results.reduce((n, r) => n + r.fixes.length, 0),
    },
    headroom: years.flatMap((y) => headroomFromUsage(programs, usage, y, institutionId)),
  };
}

function headroomFromUsage(programs, usage, year) {
  return programs.map((p) => {
    const u = usage.get(`${p.id}:${year}`) || { reg: 0, sup: 0 };
    return {
      program_id: p.id, name: p.name, year, intake: p.approved_intake, super_cap: p.super_cap,
      regular_used: u.reg, super_used: u.sup, headroom: p.approved_intake - u.reg, super_headroom: p.super_cap - u.sup,
    };
  });
}

// ---------- persistence ----------
export async function commitResults(user, institutionId, filename, processed) {
  const ts = now();
  const handshakes = [];
  let accepted = 0;
  tx(() => {
    for (const r of processed.results) {
      if (!r.accepted) continue;
      const d = r.data;
      const vals = [d.student_ref, d.name, d.dob, d.gender, d.category, d.nri, d.oci, d.fn, d.supernumerary, d.program.id, d.admission_year, d.email, d.phone, d.status];
      let sid = d.existingId;
      if (sid) {
        db.prepare('UPDATE students SET student_ref=?, name=?, dob=?, gender=?, category=?, nri=?, oci=?, fn=?, supernumerary=?, program_id=?, admission_year=?, email=?, phone=?, status=?, updated_at=? WHERE id=?').run(...vals, ts, sid);
      } else {
        const res = db.prepare('INSERT INTO students (apaar_hash, apaar_enc, institution_id, student_ref, name, dob, gender, category, nri, oci, fn, supernumerary, program_id, admission_year, email, phone, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .run(d.hash, encrypt(d.apaar_id), institutionId, ...vals, ts, ts);
        sid = Number(res.lastInsertRowid);
        db.prepare('INSERT OR IGNORE INTO consents (student_id, updated_at) VALUES (?,?)').run(sid, ts);
      }
      accepted++;
      if (d.crossDup) {
        const [a, b] = [sid, d.crossDup.id].sort((x, y) => x - y);
        const exists = db.prepare('SELECT id FROM handshakes WHERE student_a = ? AND student_b = ?').get(a, b);
        if (!exists) {
          const h = db.prepare('INSERT INTO handshakes (apaar_hash, student_a, student_b, inst_a, inst_b, created_at) VALUES (?,?,?,?,?,?)').run(d.hash, sid, d.crossDup.id, institutionId, d.crossDup.institution_id, ts);
          handshakes.push({ id: Number(h.lastInsertRowid), other: d.crossDup.institution_id });
          db.prepare('INSERT OR IGNORE INTO flags (type, severity, institution_id, student_id, year, message, dedupe_key, created_at) VALUES (?,?,?,?,?,?,?,?)')
            .run('CROSS_DUP', 'medium', institutionId, sid, d.admission_year, 'Possible duplicate enrolment across institutions', `dup:${a}:${b}`, ts);
        }
      }
      for (const w of r.issues.filter((i) => i.severity === 'warning' && i.code !== 'CROSS_DUP')) {
        db.prepare('INSERT OR IGNORE INTO flags (type, severity, institution_id, student_id, year, message, dedupe_key, created_at) VALUES (?,?,?,?,?,?,?,?)')
          .run('DATA_QUALITY', 'low', institutionId, sid, d.admission_year, w.message, `dq:${sid}:${w.code}`, ts);
      }
    }
    const s = processed.summary;
    db.prepare('INSERT INTO uploads (institution_id, user_id, filename, total, accepted, autofixed, warnings, rejected, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(institutionId, user.id, filename || 'api', s.total, accepted, s.autofixes, s.warning, s.error, ts);
    db.prepare('UPDATE institutions SET last_upload_at = ? WHERE id = ?').run(ts, institutionId);
  });

  // Soft handshake: tell both institutions, neutrally, and let them settle it.
  const me = db.prepare('SELECT name FROM institutions WHERE id = ?').get(institutionId);
  for (const h of handshakes) {
    const body = 'A student appears to be enrolled at two institutions at once. Please confirm whether this is a transfer, a withdrawal or a data error.';
    await notifyInstitution(institutionId, 'Please confirm a possible duplicate enrolment', body, '/inbox');
    await notifyInstitution(h.other, 'Please confirm a possible duplicate enrolment', body, '/inbox');
  }
  return { accepted, handshakes: handshakes.length };
}
