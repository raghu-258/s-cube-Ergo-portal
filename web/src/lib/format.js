// A course counts as completed once this share of it has been watched (the server uses the same value).
export const COMPLETE_AT = 90;
export const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;

// a = deep, b/c = thumbnail gradient, ink = text on thumbnail
export const THEMES = [
  { a: '#1f6f68', b: '#83c1bd', c: '#d0e9df', ink: '#123f3b' },
  { a: '#a4503a', b: '#f0a58f', c: '#fbe0d5', ink: '#6b2d1d' },
  { a: '#8a6514', b: '#f0c86d', c: '#fbeccb', ink: '#5c4508' },
  { a: '#554890', b: '#a69ad8', c: '#e4dff5', ink: '#342a66' },
  { a: '#2f6a93', b: '#8dbbe0', c: '#dcebf6', ink: '#1c4461' },
  { a: '#203f42', b: '#2a5256', c: '#5b9a90', ink: '#e7f5f0' },
  { a: '#8f4450', b: '#e5a3a8', c: '#f7dfe0', ink: '#5e2630' },
  { a: '#4f6833', b: '#a9c28a', c: '#e5eed9', ink: '#34461f' },
];

export const CATEGORIES = ['Foundations', 'Productivity', 'Sales', 'Policy', 'Design', 'Communication', 'Leadership', 'Operations'];
const TONES = ['amber', 'teal', 'lilac', 'rose', 'sky', 'sand'];

export function toneOf(key) {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

export const initials = (n) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
export const firstName = (n) => n.split(/\s+/)[0];
export const byNewest = (a, b) => b.uploadedAt - a.uploadedAt;
export const isNew = (c) => Date.now() - c.uploadedAt < 7 * DAY;

export function fmtClock(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? h + ':' : ''}${mm}:${String(r).padStart(2, '0')}`;
}

export function fmtDur(s) {
  if (s > 0 && s < 60) return '< 1 min';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function fmtRel(ts) {
  if (!ts) return 'Never';
  const d = Date.now() - ts;
  if (d < MIN) return 'Just now';
  if (d < HOUR) return `${Math.floor(d / MIN)} min ago`;
  if (d < DAY) return `${Math.floor(d / HOUR)} h ago`;
  if (d < 2 * DAY) return 'Yesterday';
  return `${Math.floor(d / DAY)} days ago`;
}

export const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const todayLabel = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
export const heatClass = (p) => (p <= 0 ? 'h0' : p < 25 ? 'h1' : p < 50 ? 'h2' : p < 75 ? 'h3' : p < COMPLETE_AT ? 'h4' : 'h5');

export function parseYouTube(url) {
  const m = String(url).trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}
