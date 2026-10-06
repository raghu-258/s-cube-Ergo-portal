import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express from 'express';
import { loadUser } from './auth.js';
import { config } from './config.js';
import { initDb } from './db.js';
import { mailIsLive, mailMode } from './mail.js';
import { api } from './routes.js';

await initDb();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Cloud Run terminates HTTPS in front of us

app.use((_req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY' });
  next();
});

app.use('/api', cookieParser(), loadUser, api);

// The built React app (web/dist). In development Vite serves it instead, on port 5173.
const dist = process.env.WEB_DIST || fileURLToPath(new URL('../../web/dist', import.meta.url));
if (existsSync(dist)) {
  app.use(express.static(dist, {
    index: false,
    setHeaders: (res, file) => {
      if (file.includes(`${path.sep}assets${path.sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }));
  // Every other page is handled by React Router.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || !req.accepts('html')) return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server. Please try again.' : err.message });
});

app.listen(config.port, () => {
  console.log(`Scube portal API listening on http://localhost:${config.port}`);
  console.log(mailIsLive
    ? `Email: sending through ${mailMode === 'gmail-api' ? 'the Gmail API' : 'SMTP'}.`
    : 'Email: no settings, so emails (including sign-in codes) are printed here instead of sent.');
});
