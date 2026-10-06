import { createWriteStream } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { HttpError } from './util.js';

// Course videos live in Google Cloud Storage. The bucket stays private: the browser uploads and plays
// through short-lived signed URLs. Without GCS_BUCKET (local development) files go to server/.data/uploads.

const KEY_PATTERN = /^videos\/[0-9a-f-]{36}\/[\w-][\w.-]{0,119}$/; // file name can't start with "."
const LOCAL_DIR = fileURLToPath(new URL('../.data/uploads', import.meta.url)); // server/.data/uploads
const UPLOAD_URL_MINUTES = 60;
const PLAY_URL_HOURS = 6;

let bucket = null;
if (config.bucket) {
  const { Storage } = await import('@google-cloud/storage');
  const credentials = config.gcsCredentials ? JSON.parse(config.gcsCredentials) : null;
  bucket = new Storage(credentials ? { credentials, projectId: credentials.project_id } : {}).bucket(config.bucket);
}

export const validKey = (key) => typeof key === 'string' && KEY_PATTERN.test(key);
const localPath = (key) => path.join(LOCAL_DIR, ...key.split('/'));

// Where the browser should PUT the file, and the headers it must send.
export async function uploadTarget(key, contentType) {
  if (bucket) {
    const [url] = await bucket.file(key).getSignedUrl({
      version: 'v4', action: 'write', contentType, expires: Date.now() + UPLOAD_URL_MINUTES * 60e3,
    });
    return { url, headers: { 'Content-Type': contentType } };
  }
  return { url: `/api/local-files/${encodeURIComponent(key)}`, headers: { 'Content-Type': contentType, 'X-Portal': '1' } };
}

export async function playUrl(key) {
  if (bucket) {
    const [url] = await bucket.file(key).getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + PLAY_URL_HOURS * 3600e3 });
    return url;
  }
  return `/api/local-files/${encodeURIComponent(key)}`;
}

export async function exists(key) {
  if (bucket) return (await bucket.file(key).exists())[0];
  return stat(localPath(key)).then(() => true, () => false);
}

export async function remove(key) {
  try {
    if (bucket) await bucket.file(key).delete({ ignoreNotFound: true });
    else await rm(localPath(key), { force: true });
  } catch (e) {
    console.warn('Could not delete video', key, e.message);
  }
}

// ---- local development only ----
export async function saveLocal(key, req) {
  if (bucket || !validKey(key)) throw new HttpError(404, 'Not found.');
  await mkdir(path.dirname(localPath(key)), { recursive: true });
  await pipeline(req, createWriteStream(localPath(key)));
}

export function sendLocal(key, res) {
  if (bucket || !validKey(key)) throw new HttpError(404, 'Not found.');
  // dotfiles: 'allow' because the folder is ".data"; validKey() already rules out any unsafe path.
  res.sendFile(localPath(key), { acceptRanges: true, dotfiles: 'allow' });
}
