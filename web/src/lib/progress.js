import { COMPLETE_AT, byNewest } from './format.js';

export const watchedSecs = (ranges) => ranges.reduce((s, [a, b]) => s + (b - a), 0);

// Returns a new list with [a, b] added and overlapping parts merged.
export function addRange(ranges, a, b) {
  const out = [];
  [...ranges, [a, b]].sort((x, y) => x[0] - y[0]).forEach(([s, e]) => {
    const l = out[out.length - 1];
    if (l && s <= l[1] + 0.3) l[1] = Math.max(l[1], e);
    else out.push([s, e]);
  });
  return out.map(([s, e]) => [Math.round(s * 10) / 10, Math.round(e * 10) / 10]);
}

export function pctOfRanges(ranges, c) {
  const counted = ranges.map(([a, b]) => [Math.min(a, c.duration), Math.min(b, c.duration)]);
  return Math.min(100, Math.round((watchedSecs(counted) / c.duration) * 100));
}

export function pctOf(progress, uid, c) {
  const p = progress[uid] && progress[uid][c.id];
  return p ? pctOfRanges(p.ranges, c) : 0;
}

export function userStats(progress, courses, uid) {
  let total = 0, watched = 0, done = 0, inProgress = 0, last = 0;
  courses.forEach((c) => {
    total += c.duration;
    const p = progress[uid] && progress[uid][c.id];
    if (p) { watched += Math.min(c.duration, watchedSecs(p.ranges)); last = Math.max(last, p.last || 0); }
    const pct = pctOf(progress, uid, c);
    if (pct >= COMPLETE_AT) done++; else if (pct > 0) inProgress++;
  });
  return { pct: total ? Math.round((watched / total) * 100) : 0, watched, done, inProgress, last, total };
}

export function courseStats(progress, users, c) {
  const ps = users.map((u) => pctOf(progress, u.id, c));
  return {
    avg: ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : 0,
    done: ps.filter((p) => p >= COMPLETE_AT).length,
    started: ps.filter((p) => p > 0).length,
  };
}

// The course to resume, or the next one to start (required and newest first).
export function continueCourse(progress, courses, uid) {
  const withP = courses.map((c) => ({ c, p: pctOf(progress, uid, c), last: (progress[uid] && progress[uid][c.id] && progress[uid][c.id].last) || 0 }));
  const inProg = withP.filter((x) => x.p > 0 && x.p < COMPLETE_AT).sort((a, b) => b.last - a.last);
  if (inProg.length) return inProg[0];
  const fresh = withP.filter((x) => x.p === 0).sort((a, b) => (b.c.required - a.c.required) || byNewest(a.c, b.c));
  return fresh[0] || null;
}
