import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { DATA_DIR } from './crypto.js';

export const db = new DatabaseSync(path.join(DATA_DIR, 'praman.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS institutions (
  id INTEGER PRIMARY KEY, aicte_id TEXT UNIQUE, name TEXT NOT NULL, state TEXT, district TEXT,
  type TEXT, webhook_url TEXT, last_upload_at TEXT
);
CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY, institution_id INTEGER NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL, level TEXT, duration INTEGER DEFAULT 4,
  approved_intake INTEGER NOT NULL, super_cap INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prog_inst ON programs(institution_id);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL,
  name TEXT, institution_id INTEGER, student_id INTEGER, api_key TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS apaar_registry (
  apaar_hash TEXT PRIMARY KEY, apaar_enc TEXT NOT NULL, name TEXT NOT NULL, dob TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY, apaar_hash TEXT NOT NULL, apaar_enc TEXT NOT NULL, student_ref TEXT,
  name TEXT NOT NULL, dob TEXT, gender TEXT, category TEXT, nri INTEGER DEFAULT 0, oci INTEGER DEFAULT 0,
  fn INTEGER DEFAULT 0, supernumerary INTEGER DEFAULT 0, institution_id INTEGER NOT NULL REFERENCES institutions(id),
  program_id INTEGER NOT NULL REFERENCES programs(id), admission_year INTEGER NOT NULL,
  email TEXT, phone TEXT, status TEXT DEFAULT 'ADMITTED', created_at TEXT, updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_stu_apaar ON students(apaar_hash);
CREATE INDEX IF NOT EXISTS idx_stu_inst ON students(institution_id, admission_year);
CREATE INDEX IF NOT EXISTS idx_stu_prog ON students(program_id, admission_year);
CREATE TABLE IF NOT EXISTS flags (
  id INTEGER PRIMARY KEY, type TEXT NOT NULL, severity TEXT NOT NULL, institution_id INTEGER, program_id INTEGER,
  student_id INTEGER, year INTEGER, message TEXT, detail TEXT, ai_explanation TEXT, status TEXT DEFAULT 'open',
  dedupe_key TEXT UNIQUE, created_at TEXT, resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_flag_inst ON flags(institution_id, status);
CREATE TABLE IF NOT EXISTS institution_risk (
  institution_id INTEGER PRIMARY KEY, score REAL, reasons TEXT, fill REAL, enrolled INTEGER, intake INTEGER, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS handshakes (
  id INTEGER PRIMARY KEY, apaar_hash TEXT NOT NULL, student_a INTEGER, student_b INTEGER,
  inst_a INTEGER, inst_b INTEGER, status TEXT DEFAULT 'pending', resolution TEXT, created_at TEXT, resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY, user_id INTEGER, institution_id INTEGER, title TEXT, body TEXT, link TEXT,
  read INTEGER DEFAULT 0, emailed INTEGER DEFAULT 0, created_at TEXT
);
CREATE TABLE IF NOT EXISTS consents (
  student_id INTEGER PRIMARY KEY, employers INTEGER DEFAULT 1, regulators INTEGER DEFAULT 1,
  extended_fields INTEGER DEFAULT 0, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS verifications (
  id INTEGER PRIMARY KEY, student_id INTEGER, verifier_id INTEGER, verifier_role TEXT, verifier_name TEXT,
  purpose TEXT, method TEXT, result TEXT, created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ver_stu ON verifications(student_id);
CREATE TABLE IF NOT EXISTS uploads (
  id INTEGER PRIMARY KEY, institution_id INTEGER, user_id INTEGER, filename TEXT, total INTEGER, accepted INTEGER,
  autofixed INTEGER, warnings INTEGER, rejected INTEGER, created_at TEXT
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY, ts TEXT, actor_id INTEGER, actor_role TEXT, actor_name TEXT, action TEXT, target TEXT,
  meta TEXT, prev_hash TEXT, hash TEXT
);
`);

export const now = () => new Date().toISOString();
export const tx = (fn) => {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
};
