import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(import.meta.dirname, '../../../.env') });

export const DATA_DIR = path.resolve(import.meta.dirname, '../../data');
fs.mkdirSync(DATA_DIR, { recursive: true });

// Secrets come from .env when set; otherwise they are generated once and kept in server/data.
const file = path.join(DATA_DIR, 'secrets.json');
const store = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const rand = (n) => crypto.randomBytes(n).toString('hex');
store.jwt ||= rand(48);
store.aes ||= rand(32);
fs.writeFileSync(file, JSON.stringify(store));

const sha = (s) => crypto.createHash('sha256').update(s).digest();
const JWT_SECRET = process.env.JWT_SECRET || store.jwt;
const AES_KEY = sha(process.env.APAAR_ENCRYPTION_KEY || store.aes);
const HMAC_KEY = sha('lookup:' + (process.env.APAAR_ENCRYPTION_KEY || store.aes));

// Ed25519 signing key, derived from RECORD_SIGNING_KEY when set so signatures survive redeploys.
const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const seed = sha('sign:' + (process.env.RECORD_SIGNING_KEY || store.jwt));
const privateKey = crypto.createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, seed]), format: 'der', type: 'pkcs8' });
const publicKey = crypto.createPublicKey(privateKey);

export const jwtSecret = JWT_SECRET;
export const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });

export const apaarHash = (id) => crypto.createHmac('sha256', HMAC_KEY).update(String(id)).digest('hex');

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}

export function decrypt(b64) {
  const buf = Buffer.from(b64, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', AES_KEY, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
}

const b64u = (b) => Buffer.from(b).toString('base64url');

export function signToken(payload) {
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.sign(null, Buffer.from(body), privateKey);
  return `${body}.${b64u(sig)}`;
}

export function verifyToken(token) {
  try {
    const [body, sig] = String(token).split('.');
    if (!body || !sig) return null;
    const ok = crypto.verify(null, Buffer.from(body), publicKey, Buffer.from(sig, 'base64url'));
    return ok ? JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) : null;
  } catch {
    return null;
  }
}

export const sha256hex = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const randomKey = (prefix) => `${prefix}_${crypto.randomBytes(18).toString('hex')}`;
