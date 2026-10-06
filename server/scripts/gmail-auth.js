// One-time setup: lets the portal send email as your Workspace account through the Gmail API (HTTPS),
// for hosts that block SMTP such as Render's free plan.
//
// 1. Put GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET (OAuth client, type "Desktop app") in server/.env.
// 2. Run:  npm run gmail-auth -w server
// 3. Sign in as the account that should send the emails and click Allow.
// The refresh token is written into server/.env as GMAIL_REFRESH_TOKEN. Copy it to Render from there.

import { exec } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { OAuth2Client } from 'google-auth-library';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
try { process.loadEnvFile(envPath); } catch { /* checked below */ }
const { GMAIL_CLIENT_ID: id, GMAIL_CLIENT_SECRET: secret, MAIL_FROM = '', SMTP_USER = '' } = process.env;
if (!id || !secret) {
  console.error('Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to server/.env first (see README, "Gmail API").');
  process.exit(1);
}
const sender = (MAIL_FROM.match(/<([^>]+)>/) || [])[1] || SMTP_USER || undefined;

const server = http.createServer();
server.listen(0, '127.0.0.1', () => {
  const redirectUri = `http://127.0.0.1:${server.address().port}`;
  const client = new OAuth2Client(id, secret, redirectUri);
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // always return a refresh token
    scope: ['https://www.googleapis.com/auth/gmail.send'],
    login_hint: sender,
  });

  server.on('request', async (req, res) => {
    const params = new URL(req.url, redirectUri).searchParams;
    if (!params.get('code') && !params.get('error')) { res.end(); return; }
    try {
      if (params.get('error')) throw new Error(params.get('error'));
      const { tokens } = await client.getToken(params.get('code'));
      if (!tokens.refresh_token) throw new Error('Google did not return a refresh token. Run the script again.');
      saveToEnv('GMAIL_REFRESH_TOKEN', tokens.refresh_token);
      res.end('<h2 style="font-family:sans-serif">Done. The portal can now send email. You can close this tab.</h2>');
      console.log('\n✓ Saved GMAIL_REFRESH_TOKEN to server/.env. Restart the server to send email through the Gmail API.');
    } catch (e) {
      res.end(`<h2 style="font-family:sans-serif">Something went wrong: ${String(e.message).replace(/</g, '&lt;')}</h2>`);
      console.error('\n✗', e.message);
      process.exitCode = 1;
    }
    server.close();
  });

  console.log(`Opening your browser. Sign in as ${sender || 'the sending account'} and click Allow.`);
  console.log(`If it doesn't open, paste this link into your browser:\n\n${url}\n`);
  const opener = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(opener, () => {});
});

function saveToEnv(key, value) {
  let text = '';
  try { text = readFileSync(envPath, 'utf8'); } catch { /* new file */ }
  const line = `${key}=${value}`;
  text = new RegExp(`^${key}=.*$`, 'm').test(text) ? text.replace(new RegExp(`^${key}=.*$`, 'm'), line) : `${text.replace(/\n?$/, '\n')}${line}\n`;
  writeFileSync(envPath, text);
}
