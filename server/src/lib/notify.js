import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import { db, now } from './db.js';

const smtpReady = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
const transport = smtpReady
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    })
  : null;

export const emailEnabled = smtpReady;

// Always writes to the in-app inbox; additionally emails the institution's users when SMTP is configured.
export async function notifyInstitution(institutionId, title, body, link = '') {
  const users = db.prepare("SELECT id, email FROM users WHERE institution_id = ? AND role = 'institution'").all(institutionId);
  const ins = db.prepare(
    'INSERT INTO notifications (user_id, institution_id, title, body, link, created_at, emailed) VALUES (?,?,?,?,?,?,?)',
  );
  if (!users.length) ins.run(null, institutionId, title, body, link, now(), 0);
  for (const u of users) {
    let emailed = 0;
    if (transport) {
      try {
        await transport.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: u.email,
          subject: `[Praman] ${title}`,
          text: `${body}\n\n${process.env.FRONTEND_URL || ''}${link}`,
        });
        emailed = 1;
      } catch (e) {
        console.warn('email failed:', e.message);
      }
    }
    ins.run(u.id, institutionId, title, body, link, now(), emailed);
  }
  fireWebhook(institutionId, { event: 'notification', title, body });
}

export function fireWebhook(institutionId, payload) {
  const row = db.prepare('SELECT webhook_url FROM institutions WHERE id = ?').get(institutionId);
  if (!row?.webhook_url) return;
  const body = JSON.stringify({ ...payload, ts: now() });
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'praman').update(body).digest('hex');
  fetch(row.webhook_url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-praman-signature': sig },
    body,
  }).catch(() => {});
}
