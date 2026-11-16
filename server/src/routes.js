import { randomUUID, timingSafeEqual } from 'node:crypto';
import express from 'express';
import {
  endSession, requireAdmin, requirePortalHeader, requireUser, startSession, upsertUser, verifyGoogleCredential,
} from './auth.js';
import { celebrationsFeed, loadPeople, runDailyWishes, sendTestMail, todayInTimezone } from './celebrations.js';
import { config } from './config.js';
import { query } from './db.js';
import { companyEmail, rateLimit, sendLoginCode, verifyLoginCode } from './otp.js';
import * as storage from './storage.js';
import { COMPLETE_AT, HttpError, mergeRanges, nameFromEmail, str, watchedSecs } from './util.js';

export const api = express.Router();

// ---- shapes sent to the browser ----
// Admins also get each person's birthday (day + month only) and joining date, to keep them up to date.
const userOut = (u, admin = false) => ({
  id: String(u.id), name: u.name, email: u.email, dept: u.dept, role: u.role,
  ...(admin ? {
    birthday: u.birthday_month ? { m: u.birthday_month, d: u.birthday_day } : null,
    joined: u.joined_on || null,
    signedIn: !!u.last_active,
  } : {}),
});

const courseOut = (c) => ({
  id: c.id, title: c.title, short: c.short, category: c.category, desc: c.description,
  duration: c.duration, durationPending: c.duration_pending, required: c.required, theme: c.theme,
  youtube: c.youtube, videoLabel: c.video_label, hasVideo: !!c.video_key, file: c.file_name,
  chapters: typeof c.chapters === 'string' ? JSON.parse(c.chapters) : c.chapters,
  uploadedAt: new Date(c.published_at).getTime(), uploadedBy: c.published_by ? String(c.published_by) : null,
});

const asJson = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

async function activeCourse(id) {
  const { rows } = await query('SELECT * FROM courses WHERE id = $1 AND removed_at IS NULL', [String(id)]);
  if (!rows[0]) throw new HttpError(404, 'That course no longer exists.');
  return rows[0];
}

async function logEvent(userId, courseId, type) {
  await query('INSERT INTO events (user_id, course_id, type) VALUES ($1, $2, $3)', [userId, courseId, type]);
}

// ---- daily birthday & anniversary job (Cloud Scheduler) ----
// Registered before the X-Portal check: the scheduler authenticates with the shared secret instead.
api.post('/cron/daily-wishes', async (req, res) => {
  const given = Buffer.from(String(req.get('X-Cron-Secret') || ''));
  const expected = Buffer.from(config.cronSecret);
  if (!config.cronSecret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new HttpError(403, 'Forbidden.');
  }
  res.json(await runDailyWishes());
});

api.use(requirePortalHeader);
api.use(express.json({ limit: '1mb' }));

// ---- sign-in ----
// For Render's health check: the server is up and can reach the database.
api.get('/health', async (_req, res) => {
  await query('SELECT 1');
  res.json({ ok: true });
});

api.get('/config', (_req, res) => {
  res.json({ domain: config.domain, googleClientId: config.googleClientId, otpLogin: config.otpLogin });
});

api.post('/auth/google', async (req, res) => {
  if (!config.googleClientId) throw new HttpError(503, 'Google sign-in is not set up yet (GOOGLE_CLIENT_ID).');
  const user = await upsertUser(await verifyGoogleCredential(req.body && req.body.credential));
  startSession(res, user);
  res.json({ ok: true });
});

// Email sign-in, step 1: send a 6-digit code to the work address.
api.post('/auth/otp/request', rateLimit(10, 10 * 60e3), async (req, res) => {
  if (!config.otpLogin) throw new HttpError(404, 'Not found.');
  const email = companyEmail(req.body && req.body.email);
  res.json({ ok: true, ...(await sendLoginCode(email)) });
});

// Step 2: check the code and start the session.
api.post('/auth/otp/verify', rateLimit(30, 10 * 60e3), async (req, res) => {
  if (!config.otpLogin) throw new HttpError(404, 'Not found.');
  const email = companyEmail(req.body && req.body.email);
  await verifyLoginCode(email, req.body && req.body.code);
  const user = await upsertUser({ email, name: nameFromEmail(email), picture: null });
  startSession(res, user);
  res.json({ ok: true });
});

api.post('/auth/logout', (_req, res) => {
  endSession(res);
  res.json({ ok: true });
});

// ---- everything the app needs on load ----
// Admins get everyone's progress and the activity feed; employees only their own progress.
api.get('/bootstrap', requireUser, async (req, res) => {
  const me = req.user;
  const admin = me.role === 'admin';
  if (!me.last_active || Date.now() - new Date(me.last_active).getTime() > 3600e3) {
    await query('UPDATE users SET last_active = now() WHERE id = $1', [me.id]);
  }
  const [users, courses, progress, events, people] = await Promise.all([
    query('SELECT id, name, email, dept, role, birthday_month, birthday_day, joined_on, last_active FROM users ORDER BY name'),
    query('SELECT * FROM courses WHERE removed_at IS NULL ORDER BY published_at'),
    admin
      ? query('SELECT p.* FROM progress p JOIN courses c ON c.id = p.course_id WHERE c.removed_at IS NULL')
      : query('SELECT p.* FROM progress p JOIN courses c ON c.id = p.course_id WHERE c.removed_at IS NULL AND p.user_id = $1', [me.id]),
    admin
      ? query(`SELECT e.user_id, e.course_id, e.type, e.at FROM events e JOIN courses c ON c.id = e.course_id
               WHERE c.removed_at IS NULL ORDER BY e.at DESC LIMIT 60`)
      : { rows: [] },
    loadPeople(),
  ]);

  const progressOut = {};
  progress.rows.forEach((p) => {
    const uid = String(p.user_id);
    progressOut[uid] = progressOut[uid] || {};
    progressOut[uid][p.course_id] = { ranges: asJson(p.ranges), pos: p.pos, last: new Date(p.last_at).getTime(), done: p.done };
  });

  res.json({
    me: String(me.id),
    profile: {
      name: me.name, dept: me.dept,
      birthday: me.birthday_month ? { m: me.birthday_month, d: me.birthday_day } : null,
      joined: me.joined_on || null,
      optOut: me.celebrate_opt_out,
    },
    users: users.rows.map((u) => userOut(u, admin)),
    courses: courses.rows.map(courseOut),
    progress: progressOut,
    events: events.rows.map((e) => ({ user: String(e.user_id), course: e.course_id, type: e.type, at: new Date(e.at).getTime() })),
    celebrations: celebrationsFeed(people),
    testEmailRecipients: admin ? config.testEmailRecipients : [],
  });
});

// ---- watch progress ----
// The browser sends the parts of each video it has watched; they are merged with what is already saved,
// so watching on two devices never loses progress. The % is worked out here, not trusted from the browser.
api.post('/progress', requireUser, async (req, res) => {
  const me = req.user;
  const entries = Array.isArray(req.body && req.body.entries) ? req.body.entries.slice(0, 20) : [];
  const out = {};
  for (const e of entries) {
    if (!e || typeof e.course !== 'string' || !Array.isArray(e.ranges)) continue;
    const { rows: [course] } = await query('SELECT id, duration FROM courses WHERE id = $1 AND removed_at IS NULL', [e.course]);
    if (!course) continue;
    const incoming = e.ranges.slice(0, 500)
      .filter((r) => Array.isArray(r) && r.length === 2 && Number.isFinite(r[0]) && Number.isFinite(r[1]) && r[0] >= 0 && r[1] >= r[0] && r[1] < 86400);
    const { rows: [prev] } = await query('SELECT ranges, done FROM progress WHERE user_id = $1 AND course_id = $2', [me.id, course.id]);
    const ranges = mergeRanges([...(prev ? asJson(prev.ranges) : []), ...incoming]);
    const counted = ranges.map(([a, b]) => [Math.min(a, course.duration), Math.min(b, course.duration)]);
    const pct = Math.min(100, Math.round((watchedSecs(counted) / course.duration) * 100));
    const done = (prev && prev.done) || pct >= COMPLETE_AT;
    const pos = Math.max(0, Number(e.pos) || 0);
    await query(
      `INSERT INTO progress (user_id, course_id, ranges, pos, pct, done, last_at) VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (user_id, course_id) DO UPDATE SET ranges = EXCLUDED.ranges, pos = EXCLUDED.pos, pct = EXCLUDED.pct,
         done = EXCLUDED.done, last_at = now()`,
      [me.id, course.id, JSON.stringify(ranges), pos, pct, done],
    );
    const completedNow = done && !(prev && prev.done);
    if (!prev) await logEvent(me.id, course.id, 'started');
    if (completedNow) await logEvent(me.id, course.id, 'completed');
    else if (e.watched) {
      // One "watched part of" line per person and course: replace the older one.
      await query("DELETE FROM events WHERE user_id = $1 AND course_id = $2 AND type = 'watched'", [me.id, course.id]);
      await logEvent(me.id, course.id, 'watched');
    }
    out[course.id] = { ranges, pos, last: Date.now(), done };
  }
  res.json({ progress: out });
});

// ---- profile: name, department, birthday, joining date ----
// Checks the fields of a profile form (used by employees for themselves and by admins for anyone).
function profileFields(p) {
  const name = str(p.name, 80);
  if (!name) throw new HttpError(400, 'Add a name.');
  let bm = null, bd = null;
  if (p.birthday) {
    bm = Number(p.birthday.m);
    bd = Number(p.birthday.d);
    const check = new Date(Date.UTC(2000, bm - 1, bd));
    if (!(bm >= 1 && bm <= 12 && bd >= 1) || check.getUTCMonth() !== bm - 1) throw new HttpError(400, 'That birthday is not a real date.');
  }
  let joined = null;
  if (p.joined) {
    const m = String(p.joined).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (!d || d.getUTCMonth() !== +m[2] - 1 || +m[1] < 1950 || d > todayInTimezone()) {
      throw new HttpError(400, 'Enter a joining date that isn’t in the future.');
    }
    joined = m[0];
  }
  return { name, dept: str(p.dept, 80), bm, bd, joined };
}

api.put('/profile', requireUser, async (req, res) => {
  const p = req.body || {};
  const f = profileFields(p);
  await query(
    `UPDATE users SET name = $2, dept = $3, birthday_month = $4, birthday_day = $5, joined_on = $6, celebrate_opt_out = $7
     WHERE id = $1`,
    [req.user.id, f.name, f.dept, f.bm, f.bd, f.joined, p.optOut === true],
  );
  res.json({ ok: true });
});

// ---- courses ----
api.get('/courses/:id/video', requireUser, async (req, res) => {
  const course = await activeCourse(req.params.id);
  if (!course.video_key) throw new HttpError(404, 'This course has no uploaded video.');
  res.json({ url: await storage.playUrl(course.video_key) });
});

// YouTube courses are published with a placeholder length; the first player to load reports the real one.
api.post('/courses/:id/duration', requireUser, async (req, res) => {
  const course = await activeCourse(req.params.id);
  const secs = Math.round(Number(req.body && req.body.secs));
  if (!course.duration_pending || !(secs >= 1 && secs < 86400)) return res.json({ ok: false });
  const f = secs / course.duration;
  const chapters = asJson(course.chapters).map((ch) => ({ ...ch, at: Math.round(ch.at * f) }));
  await query('UPDATE courses SET duration = $2, duration_pending = FALSE, chapters = $3 WHERE id = $1 AND duration_pending',
    [course.id, secs, JSON.stringify(chapters)]);
  res.json({ ok: true });
});

// Step 1 of an upload: a signed URL the browser PUTs the video file to directly.
api.post('/uploads', requireAdmin, async (req, res) => {
  const { fileName, size, contentType } = req.body || {};
  if (!/^video\/[\w.+-]+$/.test(String(contentType))) throw new HttpError(400, 'Choose a video file (MP4, WebM or MOV).');
  if (!(Number(size) > 0 && Number(size) <= 5 * 1024 ** 3)) throw new HttpError(400, 'Video files must be smaller than 5 GB.');
  const safe = str(fileName, 200).replace(/[^\w.-]+/g, '-').slice(-100).replace(/^[-.]+|-+$/g, '') || 'video.mp4';
  const key = `videos/${randomUUID()}/${safe}`;
  res.json({ key, ...(await storage.uploadTarget(key, contentType)) });
});

// Step 2: publish the course once the file is uploaded (or with a YouTube link).
api.post('/courses', requireAdmin, async (req, res) => {
  const m = req.body || {};
  const title = str(m.title, 120);
  if (!title) throw new HttpError(400, 'Add a course title.');
  const duration = Math.round(Number(m.duration));
  if (!(duration >= 1 && duration < 86400)) throw new HttpError(400, 'Add the video length.');
  const youtube = /^[\w-]{11}$/.test(String(m.youtube || '')) ? String(m.youtube) : null;
  const videoKey = m.videoKey ? String(m.videoKey) : null;
  if (videoKey && (!storage.validKey(videoKey) || !(await storage.exists(videoKey)))) {
    throw new HttpError(400, 'The video upload did not finish. Please upload it again.');
  }
  if (!youtube && !videoKey) throw new HttpError(400, 'Add a video file or a YouTube link.');
  const chapters = (Array.isArray(m.chapters) ? m.chapters : []).slice(0, 20).map((ch) => ({
    t: str(ch && ch.t, 120) || 'Chapter',
    at: Math.max(0, Math.min(duration, Math.round(Number(ch && ch.at) || 0))),
    points: (Array.isArray(ch && ch.points) ? ch.points : []).slice(0, 5).map((x) => str(x, 200)).filter(Boolean),
  }));
  const { rows: [{ n }] } = await query('SELECT COUNT(*)::int AS n FROM courses');
  const id = `c${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const { rows: [course] } = await query(
    `INSERT INTO courses (id, title, short, category, description, duration, duration_pending, required, theme,
       youtube, video_label, video_key, file_name, chapters, published_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
    [id, title, str(m.short, 40) || title.slice(0, 18), str(m.category, 40) || 'General', str(m.desc, 1000), duration,
      m.durationPending === true && !!youtube, m.required === true, Number(n) % 8, youtube, youtube ? str(m.videoLabel, 120) || 'YouTube' : null,
      videoKey, videoKey ? str(m.fileName, 200) : null, JSON.stringify(chapters.length ? chapters : [{ t: 'Introduction', at: 0, points: [] }]),
      req.user.id],
  );
  await logEvent(req.user.id, id, 'published');
  res.json({ course: courseOut(course) });
});

api.patch('/courses/:id', requireAdmin, async (req, res) => {
  const course = await activeCourse(req.params.id);
  await query('UPDATE courses SET required = $2 WHERE id = $1', [course.id, req.body && req.body.required === true]);
  res.json({ ok: true });
});

api.delete('/courses/:id', requireAdmin, async (req, res) => {
  const course = await activeCourse(req.params.id);
  await query('UPDATE courses SET removed_at = now() WHERE id = $1', [course.id]);
  if (course.video_key) await storage.remove(course.video_key);
  res.json({ ok: true });
});

// ---- people (admins) ----
// Registers an employee before their first sign-in, with their details. Signing in later keeps these details.
api.post('/users', requireAdmin, async (req, res) => {
  const p = req.body || {};
  const email = companyEmail(p.email);
  const f = profileFields(p);
  const role = config.adminEmails.includes(email) ? 'admin' : 'employee';
  const { rows: [user] } = await query(
    `INSERT INTO users (email, name, dept, role, birthday_month, birthday_day, joined_on) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (email) DO NOTHING RETURNING *`,
    [email, f.name, f.dept, role, f.bm, f.bd, f.joined],
  );
  if (!user) throw new HttpError(409, `${email} is already registered. Find them in the list to edit their details.`);
  res.json({ user: userOut(user, true) });
});

// An admin updates someone's name, department, birthday and joining date.
api.put('/users/:id/profile', requireAdmin, async (req, res) => {
  const f = profileFields(req.body || {});
  const { rows: [user] } = await query(
    `UPDATE users SET name = $2, dept = $3, birthday_month = $4, birthday_day = $5, joined_on = $6 WHERE id = $1 RETURNING *`,
    [Number(req.params.id) || 0, f.name, f.dept, f.bm, f.bd, f.joined],
  );
  if (!user) throw new HttpError(404, 'That person was not found.');
  res.json({ user: userOut(user, true) });
});

api.patch('/users/:id', requireAdmin, async (req, res) => {
  const role = req.body && req.body.role;
  if (!['admin', 'employee'].includes(role)) throw new HttpError(400, 'Unknown role.');
  const { rows: [user] } = await query('SELECT * FROM users WHERE id = $1', [Number(req.params.id) || 0]);
  if (!user) throw new HttpError(404, 'That person was not found.');
  if (user.id === req.user.id && role !== 'admin') throw new HttpError(400, 'You can’t remove your own admin access.');
  if (role !== 'admin' && config.adminEmails.includes(user.email)) {
    throw new HttpError(400, `${user.email} is listed in ADMIN_EMAILS, so they stay an admin.`);
  }
  await query('UPDATE users SET role = $2 WHERE id = $1', [user.id, role]);
  res.json({ ok: true });
});

// ---- celebrations ----
api.post('/celebrations/test', requireAdmin, async (req, res) => {
  res.json(await sendTestMail(req.body && req.body.email));
});

// ---- local video files (development only; production uses Cloud Storage) ----
api.put('/local-files/:key', requireAdmin, async (req, res) => {
  await storage.saveLocal(req.params.key, req);
  res.json({ ok: true });
});

api.get('/local-files/:key', requireUser, (req, res) => {
  storage.sendLocal(req.params.key, res);
});

api.use((_req, _res) => {
  throw new HttpError(404, 'Not found.');
});
