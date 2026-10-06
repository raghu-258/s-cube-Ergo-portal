export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const COMPLETE_AT = 90; // a course counts as completed at this % watched (matches the web app)

export function nameFromEmail(email) {
  const local = String(email).split('@')[0];
  return local.split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') || local;
}

export const str = (v, max) => (v == null ? '' : String(v).trim().slice(0, max));

export function watchedSecs(ranges) {
  return ranges.reduce((s, [a, b]) => s + (b - a), 0);
}

// Merges overlapping or touching [start, end] ranges (in seconds).
export function mergeRanges(ranges) {
  const out = [];
  [...ranges].sort((x, y) => x[0] - y[0]).forEach(([s, e]) => {
    const last = out[out.length - 1];
    if (last && s <= last[1] + 0.3) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  });
  return out.map(([s, e]) => [Math.round(s * 10) / 10, Math.round(e * 10) / 10]);
}
