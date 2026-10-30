import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import './lib/crypto.js';
import { db } from './lib/db.js';
import { authenticate } from './middleware.js';
import auth from './routes/auth.js';
import institution from './routes/institution.js';
import admin from './routes/admin.js';
import verify from './routes/verify.js';
import { seed } from './seed.js';
import { emailEnabled } from './lib/notify.js';

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:5173'] : true }));
app.use(express.json({ limit: '5mb' }));
app.use((_req, res, next) => {
  res.set({ 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer' });
  next();
});
app.use('/api', authenticate);

app.get('/api/health', (_req, res) => res.json({ ok: true, email: emailEnabled, ai: process.env.GEMINI_API_KEY ? 'gemini' : process.env.ANTHROPIC_API_KEY ? 'claude' : 'template' }));
app.use('/api/auth', auth);
app.use('/api', institution);
app.use('/api', admin);
app.use('/api', verify);

app.get('/api/sample-upload.csv', (_req, res) => {
  const f = path.resolve(import.meta.dirname, '../data/sample-upload.csv');
  fs.existsSync(f) ? res.download(f, 'praman-sample-upload.csv') : res.status(404).end();
});

// Serve the built frontend when present (single-service deploy on Render).
const dist = path.resolve(import.meta.dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong on our side' });
});

// First run (e.g. a fresh Render disk): populate demo data automatically.
if (!db.prepare('SELECT COUNT(*) c FROM institutions').get().c) {
  console.log('Empty database, seeding demo data...');
  seed();
}

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Praman API on :${port} (email ${emailEnabled ? 'on' : 'in-app only'})`));
