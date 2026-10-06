import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import { config } from './config.js';

// How mail is sent, picked from the settings:
//  1. Gmail API over HTTPS (GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN). Use this on hosts that
//     block SMTP, such as Render's free plan. Mail is sent as the Workspace account that approved access.
//  2. SMTP (SMTP_USER / SMTP_PASS), e.g. smtp.gmail.com with a Google app password.
//  3. Neither (local development): messages are only printed to the console.
const g = config.gmail;
export const mailMode = g.clientId && g.clientSecret && g.refreshToken ? 'gmail-api'
  : config.mail.user && config.mail.pass ? 'smtp' : 'console';
export const mailIsLive = mailMode !== 'console';

const smtp = mailMode === 'smtp'
  ? nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: { user: config.mail.user, pass: config.mail.pass },
  })
  : null;
// Builds the raw message for the Gmail API without sending it anywhere.
const composer = nodemailer.createTransport({ streamTransport: true, buffer: true });
const consoleOnly = nodemailer.createTransport({ jsonTransport: true });

let oauth = null;
if (mailMode === 'gmail-api') {
  oauth = new OAuth2Client(g.clientId, g.clientSecret);
  oauth.setCredentials({ refresh_token: g.refreshToken });
}

async function sendWithGmailApi(message) {
  const { message: raw } = await composer.sendMail(message);
  const { token } = await oauth.getAccessToken();
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: raw.toString('base64url') }),
  });
  if (!res.ok) throw new Error(`Gmail API ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

// fromName swaps the display name of MAIL_FROM (e.g. "Scube Learning Portal" for sign-in codes).
export async function sendMail({ to, cc, subject, html, fromName }) {
  const address = (config.mail.from.match(/<([^>]+)>/) || [null, config.mail.from])[1];
  const from = fromName ? { name: fromName, address } : config.mail.from;
  const message = { from, to, cc: cc || undefined, subject, html };
  if (mailMode === 'gmail-api') return sendWithGmailApi(message);
  if (mailMode === 'smtp') return smtp.sendMail(message);
  await consoleOnly.sendMail(message);
  console.log(`[mail not sent: no email settings] to=${to}${cc ? ` cc=${cc}` : ''} subject="${subject}"`);
}
