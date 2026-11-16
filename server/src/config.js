import { randomBytes } from 'node:crypto';

// All settings come from environment variables. See server/.env.example and README.md.
// server/.env is loaded however the server is started; variables already set (e.g. on Cloud Run) win.
try {
  process.loadEnvFile(new URL('../.env', import.meta.url));
} catch {
  // no .env file: fine
}
const env = process.env;
const list = (v) => String(v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const production = env.NODE_ENV === 'production';
const mailReady = !!(env.SMTP_USER && env.SMTP_PASS) || !!(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN);

export const config = {
  production,
  port: Number(env.PORT) || 8080,
  domain: (env.ALLOWED_DOMAIN || 'scube-ergo.com').toLowerCase(),
  googleClientId: env.GOOGLE_CLIENT_ID || '',
  sessionSecret: env.SESSION_SECRET || '',
  // "memory" runs an in-memory database for local development (data is lost on restart).
  databaseUrl: env.DATABASE_URL || 'memory',
  // These people become admins when they sign in. Admins can promote others in People & progress.
  adminEmails: list(env.ADMIN_EMAILS),
  // Sign-in with a 6-digit code emailed to the person's work address. Needs email settings in production;
  // locally the code is printed in the terminal. Set OTP_LOGIN=false to offer only Google sign-in.
  otpLogin: env.OTP_LOGIN !== 'false' && (mailReady || !production),
  // Google Cloud Storage bucket for course videos. Empty = save videos to server/.data (local only).
  bucket: env.GCS_BUCKET || '',
  // Service-account key (the JSON file's contents) for hosts outside Google Cloud, such as Render.
  // Not needed on Cloud Run, which uses the service's own identity.
  gcsCredentials: env.GCS_CREDENTIALS || '',
  timezone: env.TIMEZONE || 'Asia/Kolkata',
  portalUrl: env.PORTAL_URL || '',

  // Birthday & anniversary emails
  allEmployees: (env.ALL_EMPLOYEES_EMAIL || 'team@scube-ergo.com').toLowerCase(),
  // While set, the daily job emails only this address. Remove it to go live.
  testRecipient: (env.TEST_RECIPIENT || '').toLowerCase(),
  // Addresses allowed to receive test emails from "Send test email".
  testEmailRecipients: list(env.TEST_EMAIL_RECIPIENTS),
  // Cloud Scheduler sends this in the X-Cron-Secret header to trigger the daily job.
  cronSecret: env.CRON_SECRET || '',
  mail: {
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(env.SMTP_PORT) || 465,
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM || (env.SMTP_USER ? `Scube Celebrations <${env.SMTP_USER}>` : 'Scube Celebrations <noreply@localhost>'),
  },
  // Gmail API sending (HTTPS). Create these with: npm run gmail-auth -w server (see README).
  gmail: {
    clientId: env.GMAIL_CLIENT_ID || '',
    clientSecret: env.GMAIL_CLIENT_SECRET || '',
    refreshToken: env.GMAIL_REFRESH_TOKEN || '',
  },
};

const missing = [];
if (production) {
  if (!config.googleClientId && !config.otpLogin) missing.push('GOOGLE_CLIENT_ID, or email settings (GMAIL_* or SMTP_*) for sign-in codes');
  if (config.sessionSecret.length < 32) missing.push('SESSION_SECRET (at least 32 characters)');
  if (config.databaseUrl === 'memory') missing.push('DATABASE_URL');
}
if (missing.length) {
  throw new Error(`Missing settings for production: ${missing.join(', ')}`);
}
if (production && !config.bucket) {
  // Allowed for test deployments (e.g. Render free): videos go to the server's own disk and are lost on redeploy.
  console.warn('GCS_BUCKET is not set: course videos are stored on local disk and will be lost when the server restarts.');
}
if (!config.sessionSecret) {
  // Fine for local development: sessions just end when the server restarts.
  config.sessionSecret = randomBytes(32).toString('hex');
}
