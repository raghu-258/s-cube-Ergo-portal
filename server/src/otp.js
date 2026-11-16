import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { query } from './db.js';
import { sendMail } from './mail.js';
import { HttpError } from './util.js';

// Email sign-in: a 6-digit code sent to the person's @scube-ergo.com address.
export const CODE_MINUTES = 10;
export const RESEND_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const MAX_PER_HOUR = 5;

const hashCode = (email, code) => createHmac('sha256', config.sessionSecret).update(`${email}:${code}`).digest('hex');

export function companyEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, `Enter your full work email, like name@${config.domain}.`);
  if (email.split('@')[1] !== config.domain) throw new HttpError(403, `Only @${config.domain} accounts can sign in.`);
  return email;
}

export async function sendLoginCode(email) {
  const hourAgo = new Date(Date.now() - 3600e3);
  await query('DELETE FROM login_codes WHERE created_at < $1', [hourAgo]);
  const { rows } = await query('SELECT created_at FROM login_codes WHERE email = $1 ORDER BY created_at DESC', [email]);
  if (rows.length >= MAX_PER_HOUR) throw new HttpError(429, 'Too many codes requested for this email. Please try again in an hour.');
  const wait = rows[0] ? Math.ceil(RESEND_SECONDS - (Date.now() - new Date(rows[0].created_at).getTime()) / 1000) : 0;
  if (wait > 0) throw new HttpError(429, `Please wait ${wait} seconds before asking for another code.`);

  const code = String(randomInt(0, 1e6)).padStart(6, '0');
  // A new code replaces any earlier one.
  await query('UPDATE login_codes SET used = TRUE WHERE email = $1', [email]);
  const { rows: [saved] } = await query('INSERT INTO login_codes (email, code_hash, expires_at) VALUES ($1, $2, $3) RETURNING id',
    [email, hashCode(email, code), new Date(Date.now() + CODE_MINUTES * 60e3)]);
  try {
    await sendMail({ to: email, fromName: 'S Cube Employee Portal', subject: `${code} is your S Cube Employee Portal sign-in code`, html: renderCode(code) });
  } catch (e) {
    console.error('Could not send sign-in code to', email, e.message);
    await query('DELETE FROM login_codes WHERE id = $1', [saved.id]); // so they can retry straight away
    throw new HttpError(502, 'We couldn’t send the code right now. Please try again in a moment.');
  }
  return { resendIn: RESEND_SECONDS, expiresIn: CODE_MINUTES * 60 };
}

export async function verifyLoginCode(email, rawCode) {
  const code = String(rawCode || '').replace(/\D/g, '');
  const { rows: [row] } = await query(
    'SELECT * FROM login_codes WHERE email = $1 AND used = FALSE AND expires_at > $2 ORDER BY created_at DESC LIMIT 1',
    [email, new Date()],
  );
  if (!row) throw new HttpError(400, 'This code has expired or was replaced. Ask for a new one.');
  if (row.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Too many wrong tries. Ask for a new code.');
  const ok = code.length === 6 && timingSafeEqual(Buffer.from(hashCode(email, code)), Buffer.from(row.code_hash));
  if (!ok) {
    await query('UPDATE login_codes SET attempts = attempts + 1 WHERE id = $1', [row.id]);
    const left = MAX_ATTEMPTS - row.attempts - 1;
    throw new HttpError(400, left > 0 ? `That code isn’t right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong tries. Ask for a new code.');
  }
  await query('UPDATE login_codes SET used = TRUE WHERE email = $1', [email]);
}

// Simple per-IP limit for the sign-in endpoints (per server instance).
export function rateLimit(max, windowMs) {
  const hits = new Map();
  return (req, _res, next) => {
    const now = Date.now();
    const list = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
    if (list.length >= max) throw new HttpError(429, 'Too many attempts from this network. Please wait a few minutes.');
    list.push(now);
    hits.set(req.ip, list);
    if (hits.size > 5000) hits.clear();
    next();
  };
}

function renderCode(code) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e6e9e7;border-radius:12px;overflow:hidden">
      <div style="background:#203f42;color:#ffffff;padding:24px 28px">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a8dfce">S Cube Employee Portal</div>
        <div style="font-size:22px;font-weight:bold;margin-top:8px">Your sign-in code</div>
      </div>
      <div style="padding:24px 28px;color:#18212b;font-size:15px;line-height:1.6">
        <p style="margin:0 0 16px">Enter this code on the sign-in page:</p>
        <div style="font-size:34px;font-weight:bold;letter-spacing:8px;background:#eaf4f1;color:#19776f;border-radius:10px;padding:14px 0;text-align:center">${code}</div>
        <p style="margin:16px 0 0;color:#76838a;font-size:13px">It expires in ${CODE_MINUTES} minutes. If you didn’t try to sign in, you can ignore this email. Never share this code with anyone.</p>
      </div>
    </div>`;
}
