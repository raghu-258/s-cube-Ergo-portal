import { config } from './config.js';
import { query } from './db.js';
import { sendMail } from './mail.js';
import { HttpError } from './util.js';

// Birthday and work-anniversary emails to ALL_EMPLOYEES_EMAIL (team@), plus the dashboard feed.
// Dates are plain calendar days in the office time zone (TIMEZONE), held as UTC-midnight Date objects.

// A full year, so the dashboard always has the next celebrations to show (it picks what to display).
const FEED_DAYS = 366;
const ymd = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const isoDay = (day) => day.toISOString().slice(0, 10);

export function todayInTimezone(now = new Date()) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now).split('-').map(Number);
  return ymd(y, m, d);
}

// This year's date for a recurring day; 29 Feb falls on 28 Feb in non-leap years.
function onYear(month, day, year) {
  const leap = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
  return ymd(year, month, month === 2 && day === 29 && !leap ? 28 : day);
}

const isSameDay = (month, day, date) => onYear(month, day, date.getUTCFullYear()).getTime() === date.getTime();

function nextOccurrence(month, day, today) {
  const t = onYear(month, day, today.getUTCFullYear());
  return t < today ? onYear(month, day, today.getUTCFullYear() + 1) : t;
}

export async function loadPeople() {
  const { rows } = await query(
    `SELECT id, name, email, dept, birthday_month, birthday_day, joined_on FROM users
     WHERE NOT celebrate_opt_out AND (birthday_month IS NOT NULL OR joined_on IS NOT NULL)`,
  );
  return rows.map((r) => {
    const j = r.joined_on ? String(r.joined_on).split('-').map(Number) : null;
    return {
      name: r.name, email: r.email, dept: r.dept,
      birthday: r.birthday_month ? { m: r.birthday_month, d: r.birthday_day } : null,
      joined: j ? { y: j[0], m: j[1], d: j[2] } : null,
    };
  });
}

// Every birthday and work anniversary that falls on the given day.
export function wishesOn(day, people) {
  const out = [];
  people.forEach((p) => {
    if (p.birthday && isSameDay(p.birthday.m, p.birthday.d, day)) out.push({ key: `birthday:${p.email}`, person: p, wish: birthdayWish(p) });
    if (p.joined && isSameDay(p.joined.m, p.joined.d, day)) {
      const years = day.getUTCFullYear() - p.joined.y;
      if (years >= 1) out.push({ key: `anniversary:${p.email}`, person: p, wish: anniversaryWish(p, years) });
    }
  });
  return out;
}

// Upcoming dates for the dashboard: day and month only, never the birth year.
export function celebrationsFeed(people, today = todayInTimezone()) {
  const out = [];
  people.forEach((p) => {
    const base = { name: p.name, email: p.email, dept: p.dept };
    if (p.birthday && (nextOccurrence(p.birthday.m, p.birthday.d, today) - today) / 864e5 <= FEED_DAYS) {
      out.push({ ...base, type: 'birthday', month: p.birthday.m, day: p.birthday.d });
    }
    if (p.joined) {
      const next = nextOccurrence(p.joined.m, p.joined.d, today);
      if ((next - today) / 864e5 <= FEED_DAYS && next.getUTCFullYear() - p.joined.y >= 1) {
        out.push({ ...base, type: 'anniversary', month: p.joined.m, day: p.joined.d, since: p.joined.y });
      }
    }
  });
  return out;
}

// The daily job (Cloud Scheduler calls POST /api/cron/daily-wishes around 8 AM).
// Each wish is recorded before sending, so a repeated run on the same day sends nothing twice.
export async function runDailyWishes() {
  const day = todayInTimezone();
  const to = config.testRecipient || config.allEmployees;
  const tag = config.testRecipient ? '[TEST] ' : '';
  let sent = 0;
  const failed = [];
  for (const w of wishesOn(day, await loadPeople())) {
    try {
      await query('INSERT INTO celebration_sends (day, key) VALUES ($1, $2)', [isoDay(day), w.key]);
    } catch (e) {
      if (e.code === '23505' || /duplicate|unique/i.test(e.message)) continue; // already sent today
      throw e;
    }
    try {
      await sendMail({ to, cc: config.testRecipient ? '' : w.person.email, subject: tag + w.wish.subject, html: renderWish(w.wish) });
      sent++;
    } catch (e) {
      await query('DELETE FROM celebration_sends WHERE day = $1 AND key = $2', [isoDay(day), w.key]);
      failed.push(`${w.key}: ${e.message}`);
    }
  }
  if (failed.length) console.error('Daily wishes failed:', failed);
  return { day: isoDay(day), sent, failed: failed.length, testMode: !!config.testRecipient };
}

// Sends the next real celebration right now, exactly as team@ will get it on the day, but only to one
// test address. If nobody has saved dates yet, it sends a sample birthday and anniversary instead.
export async function sendTestMail(to) {
  to = String(to || '').trim().toLowerCase();
  if (!config.testEmailRecipients.includes(to) && to !== config.testRecipient) {
    throw new HttpError(400, `Test emails can only go to addresses in TEST_EMAIL_RECIPIENTS (${to || 'none given'} isn't).`);
  }
  const people = await loadPeople();
  const today = todayInTimezone();
  for (let i = 0; i <= 366; i++) {
    const day = new Date(today.getTime() + i * 864e5);
    const wishes = wishesOn(day, people);
    if (!wishes.length) continue;
    const when = day.toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    for (const w of wishes) {
      await sendMail({
        to, subject: `[TEST] ${w.wish.subject}`,
        html: renderWish(w.wish, `Test email. On ${when} this goes to ${config.allEmployees} (everyone), with ${w.person.email} in CC.`),
      });
    }
    return { to, sent: wishes.length, forDate: when, real: true };
  }
  const p = { name: 'Sample Employee', email: to, dept: 'Scube Ergo' };
  const note = `Test email with sample data: nobody has saved a birthday or joining date yet. Real wishes go to ${config.allEmployees}.`;
  await sendMail({ to, subject: `[TEST] ${birthdayWish(p).subject}`, html: renderWish(birthdayWish(p), note) });
  await sendMail({ to, subject: `[TEST] ${anniversaryWish(p, 3).subject}`, html: renderWish(anniversaryWish(p, 3), note) });
  return { to, sent: 2, real: false };
}

// ---- email content ----
function birthdayWish(p) {
  return {
    subject: `🎂 Happy Birthday, ${p.name}!`,
    lines: [
      `Today is <b>${esc(p.name)}</b>'s birthday${p.dept ? ` (${esc(p.dept)})` : ''}.`,
      'Please join us in wishing them a wonderful day and a great year ahead! 🎉',
    ],
    name: p.name,
  };
}

function anniversaryWish(p, years) {
  return {
    subject: `🎉 Happy ${years}-year work anniversary, ${p.name}!`,
    lines: [
      `<b>${esc(p.name)}</b>${p.dept ? ` (${esc(p.dept)})` : ''} completes <b>${years} year${years > 1 ? 's' : ''}</b> at Scube today.`,
      'Thank you for everything you bring to the team. Here is to many more! 🙌',
    ],
    name: p.name,
  };
}

function renderWish(wish, note) {
  return `
    ${note ? `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto 10px;background:#fbf1d9;color:#8a6514;border-radius:8px;padding:10px 14px;font-size:13px">${esc(note)}</div>` : ''}
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e6e9e7;border-radius:12px;overflow:hidden">
      <div style="background:#203f42;color:#ffffff;padding:28px 28px 22px">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a8dfce">Scube celebrations</div>
        <div style="font-size:26px;font-weight:bold;margin-top:8px">${esc(wish.subject)}</div>
      </div>
      <div style="padding:24px 28px;color:#18212b;font-size:15px;line-height:1.6">
        ${wish.lines.map((l) => `<p style="margin:0 0 12px">${l}</p>`).join('')}
        <p style="margin:0;color:#76838a;font-size:13px">Reply-all to send ${esc(String(wish.name).split(' ')[0])} your wishes.</p>
        ${config.portalUrl ? `<p style="margin:18px 0 0"><a href="${esc(config.portalUrl)}" style="color:#19776f">Open the Scube portal</a></p>` : ''}
      </div>
    </div>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
