import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db.js';
import { HttpError, nameFromEmail } from './util.js';

const google = new OAuth2Client();
const SESSION_DAYS = 7;

// Checks a Google Sign-In credential and that it belongs to a verified account on our Workspace domain.
export async function verifyGoogleCredential(credential) {
  let payload;
  try {
    const ticket = await google.verifyIdToken({ idToken: String(credential || ''), audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw new HttpError(401, 'Google sign-in failed. Please try again.');
  }
  const email = String(payload.email || '').toLowerCase();
  if (!payload.email_verified || payload.hd !== config.domain || email.split('@')[1] !== config.domain) {
    throw new HttpError(403, `Only @${config.domain} Google Workspace accounts can sign in.`);
  }
  return { email, name: payload.name || nameFromEmail(email), picture: payload.picture || null };
}

// Creates the user on first sign-in. Emails in ADMIN_EMAILS are always admins.
export async function upsertUser({ email, name, picture }) {
  const role = config.adminEmails.includes(email) ? 'admin' : 'employee';
  const { rows } = await query(
    `INSERT INTO users (email, name, picture, role, last_active) VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (email) DO UPDATE SET picture = COALESCE(EXCLUDED.picture, users.picture), last_active = now(),
       role = CASE WHEN EXCLUDED.role = 'admin' THEN 'admin' ELSE users.role END
     RETURNING *`,
    [email, name, picture, role],
  );
  return rows[0];
}

export function startSession(res, user) {
  const token = jwt.sign({ uid: user.id }, config.sessionSecret, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie('sid', token, { httpOnly: true, secure: config.production, sameSite: 'lax', maxAge: SESSION_DAYS * 864e5, path: '/' });
}

export function endSession(res) {
  res.clearCookie('sid', { path: '/' });
}

// Attaches req.user when the session cookie is valid.
export async function loadUser(req, _res, next) {
  const token = req.cookies && req.cookies.sid;
  if (token) {
    try {
      const { uid } = jwt.verify(token, config.sessionSecret);
      const { rows } = await query('SELECT * FROM users WHERE id = $1', [uid]);
      req.user = rows[0] || null;
    } catch {
      req.user = null;
    }
  }
  next();
}

export function requireUser(req, _res, next) {
  if (!req.user) throw new HttpError(401, 'Please sign in.');
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) throw new HttpError(401, 'Please sign in.');
  if (req.user.role !== 'admin') throw new HttpError(403, 'Only portal admins can do that.');
  next();
}

// Requests that change data must carry this header. A plain cross-site form or link can't set it,
// which (with the SameSite cookie) blocks cross-site request forgery.
export function requirePortalHeader(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.get('X-Portal') === '1') return next();
  throw new HttpError(403, 'Bad request.');
}
