import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { db, now, tx } from './lib/db.js';
import { apaarHash, encrypt, randomKey, DATA_DIR } from './lib/crypto.js';
import { makeApaar } from './lib/verhoeff.js';
import { runScan } from './lib/anomaly.js';
import { audit } from './lib/audit.js';

// Deterministic RNG so the demo data is the same on every machine.
let s = 20260101;
const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const chance = (p) => rnd() < p;

const STATES = {
  Maharashtra: ['Pune', 'Mumbai', 'Nagpur', 'Nashik'], 'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
  Karnataka: ['Bengaluru', 'Mysuru', 'Mangaluru'], 'Uttar Pradesh': ['Lucknow', 'Noida', 'Kanpur'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara'], Rajasthan: ['Jaipur', 'Kota', 'Jodhpur'],
  'West Bengal': ['Kolkata', 'Durgapur'], Telangana: ['Hyderabad', 'Warangal'], Delhi: ['New Delhi'],
  Punjab: ['Ludhiana', 'Amritsar'], 'Madhya Pradesh': ['Bhopal', 'Indore'], Kerala: ['Kochi', 'Thiruvananthapuram'],
  Bihar: ['Patna'], Odisha: ['Bhubaneswar'], Haryana: ['Gurugram', 'Faridabad'],
};
const STEMS = ['Sahyadri', 'Vindhya', 'Aravali', 'Nilgiri', 'Kaveri', 'Ganga', 'Himalaya', 'Konark', 'Charminar', 'Deccan', 'Malwa', 'Brahmaputra', 'Narmada', 'Satpura', 'Godavari', 'Yamuna'];
const KINDS = ['Institute of Technology', 'College of Engineering', 'School of Management', 'Institute of Engineering & Technology', 'Polytechnic', 'Institute of Management Studies'];
const PROGRAMS = [
  ['B.Tech Computer Science', 'UG', 4, 60, 240], ['B.Tech Electronics', 'UG', 4, 60, 180], ['B.Tech Mechanical', 'UG', 4, 60, 180],
  ['B.Tech Civil', 'UG', 4, 60, 120], ['MBA', 'PG', 2, 60, 180], ['MCA', 'PG', 2, 60, 120], ['PGDM', 'PG', 2, 60, 120], ['Diploma Engineering', 'Diploma', 3, 60, 180],
];
const FIRST = ['Aarav', 'Vihaan', 'Arjun', 'Rohan', 'Ishaan', 'Kabir', 'Aditya', 'Siddharth', 'Karan', 'Rahul', 'Ananya', 'Diya', 'Saanvi', 'Priya', 'Neha', 'Kavya', 'Meera', 'Pooja', 'Riya', 'Sneha', 'Ayush', 'Harsh', 'Tanvi', 'Nikhil', 'Shreya', 'Varun', 'Isha', 'Manav', 'Zoya', 'Farhan'];
const LAST = ['Sharma', 'Verma', 'Patil', 'Deshmukh', 'Iyer', 'Nair', 'Reddy', 'Gupta', 'Singh', 'Khan', 'Mehta', 'Joshi', 'Kulkarni', 'Das', 'Bose', 'Chauhan', 'Yadav', 'Pillai', 'Menon', 'Shetty', 'More', 'Jadhav', 'Rao', 'Kapoor', 'Malik'];

const CURRENT = 2025;
const YEARS = [2023, 2024, 2025];
const pad = (n) => String(n).padStart(2, '0');
const mkName = () => `${pick(FIRST)} ${pick(LAST)}`;
const mkDob = (year, level) => {
  const age = level === 'PG' ? 21 + Math.floor(rnd() * 4) : level === 'Diploma' ? 16 + Math.floor(rnd() * 2) : 18 + Math.floor(rnd() * 2);
  return `${year - age}-${pad(1 + Math.floor(rnd() * 12))}-${pad(1 + Math.floor(rnd() * 28))}`;
};

let apaarSeq = 0;
const newApaar = () => makeApaar(String(30000000000 + (++apaarSeq) * 7919 + Math.floor(rnd() * 5)));

function reset() {
  for (const t of ['audit_log', 'verifications', 'consents', 'notifications', 'handshakes', 'flags', 'institution_risk', 'uploads', 'students', 'apaar_registry', 'users', 'programs', 'institutions'])
    db.exec(`DELETE FROM ${t}`);
}

export function seed() {
  reset();
  const ts = now();
  const registry = db.prepare('INSERT OR IGNORE INTO apaar_registry VALUES (?,?,?,?)');
  const insStu = db.prepare('INSERT INTO students (apaar_hash, apaar_enc, institution_id, student_ref, name, dob, gender, category, nri, oci, fn, supernumerary, program_id, admission_year, email, phone, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const insCons = db.prepare('INSERT INTO consents (student_id, updated_at) VALUES (?,?)');
  const people = [];   // reusable identities, for planting cross-institution duplicates
  const planted = { breach: 0, dups: 0 };
  let demoStudent = null;

  tx(() => {
    const stateList = Object.keys(STATES);
    for (let n = 1; n <= 60; n++) {
      const state = n === 1 ? 'Maharashtra' : stateList[(n * 7) % stateList.length];
      const district = pick(STATES[state]);
      const name = n === 1 ? 'Demo Institute of Technology' : `${pick(STEMS)} ${pick(KINDS)}, ${district}`;
      const ir = db.prepare('INSERT INTO institutions (id, aicte_id, name, state, district, type, last_upload_at) VALUES (?,?,?,?,?,?,?)')
        .run(n, `1-${4000000 + n * 137}`, name, state, district, chance(0.4) ? 'Government-aided' : 'Private',
          new Date(Date.now() - (n === 1 ? 2 : [1, 3, 9, 20, 45, 70, 120][n % 7]) * 86400000).toISOString());
      const iid = Number(ir.lastInsertRowid);
      const isPG = /Management/.test(name);
      const plist = isPG ? PROGRAMS.filter((p) => p[1] === 'PG') : PROGRAMS.filter((p) => p[1] !== 'PG' || chance(0.3)).slice(0, 3 + Math.floor(rnd() * 3));
      const breachInst = n % 11 === 0;          // planted: over-intake
      const spikeInst = n % 13 === 0;           // planted: sudden NRI/FN-heavy spike
      for (const [pname, level, duration, lo, hi] of plist) {
        const intake = Math.round((lo + rnd() * (hi - lo)) / 30) * 30 || 60;
        const pr = db.prepare('INSERT INTO programs (institution_id, name, level, duration, approved_intake, super_cap) VALUES (?,?,?,?,?,?)')
          .run(iid, pname, level, duration, intake, Math.ceil(intake * 0.15));
        const pid = Number(pr.lastInsertRowid);
        for (const y of YEARS) {
          let fill = 0.72 + rnd() * 0.26;
          if (breachInst && y === CURRENT) fill = 1.1 + rnd() * 0.15;
          if (spikeInst && y === CURRENT) fill = 0.98;
          const total = Math.round(intake * fill);
          const superN = Math.min(Math.ceil(intake * 0.15), Math.round(total * (spikeInst && y === CURRENT ? 0.3 : 0.04 * rnd())));
          if (breachInst && y === CURRENT) planted.breach++;
          for (let k = 0; k < total; k++) {
            const isSuper = k < superN;
            const fnv = isSuper && chance(0.6) ? 1 : 0;
            const oci = isSuper && !fnv ? 1 : 0;
            const nri = !isSuper && chance(spikeInst && y === CURRENT ? 0.35 : 0.04) ? 1 : 0;
            const nm = mkName();
            const id = newApaar();
            const dob = mkDob(y, level);
            registry.run(apaarHash(id), encrypt(id), nm, dob);
            const status = y === 2023 && duration <= 3 ? 'GRADUATED' : chance(0.015) ? 'WITHDRAWN' : 'ADMITTED';
            const r = insStu.run(apaarHash(id), encrypt(id), iid, `${iid}${y % 100}${pid}${String(k + 1).padStart(4, '0')}`, nm, dob,
              chance(0.35) ? 'F' : 'M', pick(['GENERAL', 'GENERAL', 'OBC', 'OBC', 'SC', 'ST', 'EWS']), nri, oci, fnv, isSuper ? 1 : 0, pid, y,
              `${nm.toLowerCase().replace(/ /g, '.')}${k}@mail.example`, String(9000000000 + Math.floor(rnd() * 99999999)), status, ts, ts);
            const sid = Number(r.lastInsertRowid);
            insCons.run(sid, ts);
            if (iid === 1 && y === CURRENT && k === 5 && !demoStudent) demoStudent = { id: sid, name: nm, apaar: id, pid };
            if (status === 'ADMITTED' && chance(0.004)) people.push({ nm, dob, id, level, y, iid });
          }
        }
      }
    }

    // Planted cross-institution duplicates: the same APAAR ID enrolled at a second institution in the same year.
    const insNotif = db.prepare('INSERT INTO notifications (institution_id, title, body, link, created_at) VALUES (?,?,?,?,?)');
    people.slice(0, 45).forEach((p, idx) => {
      const other = idx < 3 && p.iid !== 1
        ? db.prepare('SELECT p.id pid, p.institution_id iid, p.level FROM programs p WHERE p.institution_id = 1 AND p.level = ? LIMIT 1').get(p.level)
        : db.prepare('SELECT p.id pid, p.institution_id iid, p.level FROM programs p WHERE p.institution_id != ? AND p.level = ? ORDER BY RANDOM() LIMIT 1').get(p.iid, p.level);
      if (!other) return;
      const r = insStu.run(apaarHash(p.id), encrypt(p.id), other.iid, `X${other.iid}${p.y % 100}${Math.floor(rnd() * 99999)}`, p.nm, p.dob, 'M', 'GENERAL', 0, 0, 0, 0, other.pid, p.y, null, null, 'ADMITTED', ts, ts);
      insCons.run(Number(r.lastInsertRowid), ts);
      planted.dups++;
      if (other.iid === 1 || p.iid === 1) {
        insNotif.run(1, 'Please confirm a possible duplicate enrolment', `Student ${p.nm} (${p.y}) appears enrolled at two institutions simultaneously. Please review in your Soft Handshake Inbox.`, '/institution/inbox', ts);
      }
    });

    // Extra registry identities that are not enrolled anywhere yet (used by the sample upload file).
    const spare = [];
    for (let i = 0; i < 40; i++) {
      const nm = mkName(), id = newApaar(), dob = mkDob(CURRENT, 'UG');
      registry.run(apaarHash(id), encrypt(id), nm, dob);
      spare.push({ id, nm, dob });
    }
    fs.writeFileSync(path.join(DATA_DIR, 'spare.json'), JSON.stringify(spare));

    // Users
    const hash = (p) => bcrypt.hashSync(p, 8);
    const U = db.prepare('INSERT INTO users (email, password_hash, role, name, institution_id, student_id, api_key) VALUES (?,?,?,?,?,?,?)');
    U.run(process.env.DEMO_ADMIN_EMAIL || 'admin@aicte.demo', hash(process.env.DEMO_ADMIN_PASSWORD || 'Admin@123'), 'admin', 'AICTE Administrator', null, null, null);
    U.run(process.env.DEMO_INSTITUTION_EMAIL || 'institute@demo.edu', hash(process.env.DEMO_INSTITUTION_PASSWORD || 'Inst@123'), 'institution', 'Registrar, Demo Institute of Technology', 1, null, randomKey('prm'));
    U.run('employer@demo.com', hash('Emp@123'), 'verifier', 'Talent Acquisition (Demo Corp)', null, null, null);
    U.run('regulator@demo.gov', hash('Reg@123'), 'regulator', 'State Technical Education Board', null, null, null);
    if (demoStudent) U.run('student@demo.in', hash('Stud@123'), 'student', demoStudent.name, null, demoStudent.id, null);
    // one login per remaining institution (password Inst@123) so every institution can be demoed
    for (let n = 2; n <= 60; n++) U.run(`registrar${n}@demo.edu`, hash('Inst@123'), 'institution', `Registrar, institution ${n}`, n, null, randomKey('prm'));
  });

  // Sample upload for the demo institution: deliberately messy, so the autocorrect/validation shows off.
  const spare = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'spare.json'), 'utf8'));
  const prog = db.prepare('SELECT name FROM programs WHERE institution_id = 1 ORDER BY id').all();
  const dup = db.prepare("SELECT s.apaar_enc, s.name, s.dob FROM students s WHERE s.institution_id = 5 AND s.status = 'ADMITTED' AND s.admission_year = 2025 LIMIT 1").get();
  const rows = ['apaar_id,student_id,name,dob,gender,category,nri,oci,fn,supernumerary,program,admission_year,email,phone,status'];
  const fmt = (d) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y.slice(2)}`; };
  spare.slice(0, 24).forEach((p, i) => {
    let apaar = p.id, name = p.nm.toUpperCase(), dob = fmt(p.dob), cat = pick(['Gen', 'general', 'OBC', 'sc', 'EWS']), program = prog[i % prog.length].name, nri = 'N';
    if (i === 3) apaar = p.id.slice(0, 5) + String((+p.id[5] + 1) % 10) + p.id.slice(6);   // typo
    if (i === 7) apaar = p.id.slice(0, 6) + ' ' + p.id.slice(6);                           // spacing
    if (i === 9) apaar = '';                                                               // missing
    if (i === 12) dob = '31/02/05';                                                        // impossible date
    if (i === 15) program = program.replace('B.Tech', 'Btech');                            // programme spelling
    if (i === 18) nri = 'Yes';
    rows.push([apaar, `DIT25${String(i + 1).padStart(3, '0')}`, name, dob, i % 3 ? 'male' : 'Female', cat, nri, 'N', i === 21 ? 'Y' : 'N', i === 22 ? 'Y' : 'N', program, 2025, `s${i}@mail.example`, `+91 98${String(10000000 + i * 137).slice(0, 8)}`, 'Admitted'].join(','));
  });
  if (spare[0]) rows.push([spare[0].id, 'DIT25099', spare[0].nm, fmt(spare[0].dob), 'M', 'GEN', 'N', 'N', 'N', 'N', prog[0].name, 2025, '', '', 'Admitted'].join(','));   // in-file duplicate
  fs.writeFileSync(path.join(DATA_DIR, 'sample-upload.csv'), rows.join('\n') + '\n');

  const scan = runScan();
  audit({ id: null, role: 'system', name: 'seed' }, 'SEED', 'database', { institutions: 60, planted });
  return { planted, scan, demoStudent: demoStudent?.id };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const r = seed();
  const n = db.prepare('SELECT COUNT(*) c FROM students').get().c;
  console.log('Seeded', n, 'students.', JSON.stringify(r));
}
