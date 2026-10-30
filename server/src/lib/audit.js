import { db, now } from './db.js';
import { sha256hex } from './crypto.js';

// Hash-chained audit trail: each row commits to the previous row's hash, so edits are detectable.
export function audit(actor, action, target = '', meta = {}) {
  const prev = db.prepare('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1').get();
  const prevHash = prev?.hash || 'GENESIS';
  const ts = now();
  const metaJson = JSON.stringify(meta);
  const a = actor || {};
  const hash = sha256hex([prevHash, ts, a.id ?? '', a.role ?? '', action, target, metaJson].join('|'));
  db.prepare(
    'INSERT INTO audit_log (ts, actor_id, actor_role, actor_name, action, target, meta, prev_hash, hash) VALUES (?,?,?,?,?,?,?,?,?)',
  ).run(ts, a.id ?? null, a.role ?? null, a.name ?? null, action, target, metaJson, prevHash, hash);
}

export function verifyChain() {
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY id').all();
  let prev = 'GENESIS';
  for (const r of rows) {
    const h = sha256hex([prev, r.ts, r.actor_id ?? '', r.actor_role ?? '', r.action, r.target, r.meta].join('|'));
    if (r.prev_hash !== prev || r.hash !== h) return { ok: false, brokenAt: r.id, total: rows.length };
    prev = r.hash;
  }
  return { ok: true, total: rows.length };
}
