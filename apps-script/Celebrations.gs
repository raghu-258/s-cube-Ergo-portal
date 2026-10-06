/**
 * Scube Celebrations: birthday and work-anniversary emails, plus the backend for the portal.
 *
 * NOTE: superseded by the Node.js portal (server/src/celebrations.js). Kept so the existing
 * Google Sheet + Apps Script setup keeps working until the new portal is live.
 *
 * Lives in the Apps Script project attached to the "Employee Directory" Google Sheet
 * (Extensions → Apps Script). See apps-script/SETUP.md for the full setup.
 *
 * Sheet tab "Employees", header row (column order does not matter, missing columns are added):
 *   Name | Email | Department | Birthday | Joining Date | Opt Out
 * Employees fill in their own dates from "My profile" in the portal; HR can also edit the sheet.
 */

// ---- settings ----
const SHEET_NAME = 'Employees';
const DOMAIN = 'scube-ergo.com';
// Official address that reaches every employee. One email to it counts as one recipient.
const ALL_EMPLOYEES = 'team@scube-ergo.com';
// While testing, the daily job sends only to this address. Set to '' to go live.
const TEST_RECIPIENT = 'raghu@scube-ergo.com';
// Addresses allowed to receive test emails. Add a colleague here, then run sendTestToAdmins.
const ADMINS = ['raghu@scube-ergo.com', 'sneha@scube-ergo.com'];
const SENDER_NAME = 'Scube Celebrations';
const PORTAL_URL = ''; // optional: link shown at the bottom of each email
// How far ahead the portal feed looks. The portal shows the next 30 days.
const FEED_DAYS = 45;
const HEADERS = ['Name', 'Email', 'Department', 'Birthday', 'Joining Date', 'Opt Out'];

// ---- daily job (run by a time-driven trigger, see createDailyTrigger) ----
function sendDailyWishes() {
  const today = startOfDay(new Date());
  const sentKey = 'sent-' + Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const props = PropertiesService.getScriptProperties();
  const sent = JSON.parse(props.getProperty(sentKey) || '[]');
  const to = TEST_RECIPIENT || ALL_EMPLOYEES;
  const tag = TEST_RECIPIENT ? '[TEST] ' : '';

  wishesOn(today, readEmployees()).forEach((w) => {
    sendOnce(sent, w.key, () => deliver(to, TEST_RECIPIENT ? '' : w.person.email, w.wish, tag));
  });

  props.setProperty(sentKey, JSON.stringify(sent));
  cleanOldSentKeys(props, sentKey);
}

// Every birthday and work anniversary that falls on the given day.
function wishesOn(day, people) {
  const out = [];
  people.forEach((p) => {
    if (p.birthday && isSameDay(p.birthday, day)) out.push({ key: 'birthday:' + p.email, person: p, wish: birthdayWish(p) });
    if (p.joined && isSameDay(p.joined, day)) {
      const years = day.getFullYear() - p.joined.getFullYear();
      if (years >= 1) out.push({ key: 'anniversary:' + p.email, person: p, wish: anniversaryWish(p, years) });
    }
  });
  return out;
}

// Guards against double emails if the trigger runs twice or you run it by hand the same day.
function sendOnce(sent, key, fn) {
  if (sent.includes(key)) return;
  fn();
  sent.push(key);
}

// ---- test emails ----
// Run from the editor, or request it from the portal. Sends the next real celebration in the sheet
// right now, exactly as team@ will get it on the day, but only to the test address.
// If nobody has saved dates yet, it sends a sample birthday and anniversary instead.
function sendTestMail(email) {
  const to = String(email || Session.getActiveUser().getEmail() || TEST_RECIPIENT).trim().toLowerCase();
  if (!ADMINS.includes(to) && to !== TEST_RECIPIENT) {
    throw new Error(`Test emails can only go to addresses listed in ADMINS in the Apps Script (${to} isn't).`);
  }
  const today = startOfDay(new Date());
  const people = readEmployees();
  for (let i = 0; i <= 366; i++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const wishes = wishesOn(day, people);
    if (!wishes.length) continue;
    const when = Utilities.formatDate(day, Session.getScriptTimeZone(), 'EEEE d MMMM yyyy');
    wishes.forEach((w) => deliver(to, '', w.wish, '[TEST] ',
      `Test email. On ${when} this goes to ${ALL_EMPLOYEES} (everyone), with ${w.person.email} in CC.`));
    Logger.log(`Sent ${wishes.length} test email(s) for ${when} to ${to}`);
    return { ok: true, to, sent: wishes.length, forDate: when, real: true };
  }
  const p = people.find((x) => x.email === to) || { name: 'Sample Employee', email: to, dept: 'Scube Ergo' };
  const note = `Test email with sample data: nobody has saved a birthday or joining date yet. Real wishes go to ${ALL_EMPLOYEES}.`;
  deliver(to, '', birthdayWish(p), '[TEST] ', note);
  deliver(to, '', anniversaryWish(p, 3), '[TEST] ', note);
  Logger.log('No dates in the sheet yet; sent sample test emails to ' + to);
  return { ok: true, to, sent: 2, real: false };
}

// Editor shortcut: sends the test email to every address in ADMINS (for example you and a colleague).
function sendTestToAdmins() {
  ADMINS.forEach((a) => sendTestMail(a));
}

// ---- email ----
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

function deliver(to, cc, wish, tag, note) {
  const html = `
    ${note ? `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto 10px;background:#fbf1d9;color:#8a6514;border-radius:8px;padding:10px 14px;font-size:13px">${esc(note)}</div>` : ''}
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e6e9e7;border-radius:12px;overflow:hidden">
      <div style="background:#203f42;color:#ffffff;padding:28px 28px 22px">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a8dfce">Scube celebrations</div>
        <div style="font-size:26px;font-weight:bold;margin-top:8px">${esc(wish.subject)}</div>
      </div>
      <div style="padding:24px 28px;color:#18212b;font-size:15px;line-height:1.6">
        ${wish.lines.map((l) => `<p style="margin:0 0 12px">${l}</p>`).join('')}
        <p style="margin:0;color:#76838a;font-size:13px">Reply-all to send ${esc(String(wish.name).split(' ')[0])} your wishes.</p>
        ${PORTAL_URL ? `<p style="margin:18px 0 0"><a href="${PORTAL_URL}" style="color:#19776f">Open the Scube portal</a></p>` : ''}
      </div>
    </div>`;
  MailApp.sendEmail({ to, cc, subject: (tag || '') + wish.subject, htmlBody: html, name: SENDER_NAME });
}

// ---- web app: feed for the portal dashboard ----
// Returns only day and month (never birth year) for people with a date in the next FEED_DAYS days.
function doGet() {
  const today = startOfDay(new Date());
  const out = [];
  readEmployees().forEach((p) => {
    [['birthday', p.birthday], ['anniversary', p.joined]].forEach(([type, d]) => {
      if (!d) return;
      const next = nextOccurrence(d, today);
      const days = Math.round((next - today) / 864e5);
      if (days > FEED_DAYS) return;
      const row = { type, name: p.name, email: p.email, dept: p.dept, month: d.getMonth() + 1, day: d.getDate() };
      if (type === 'anniversary') {
        if (next.getFullYear() - d.getFullYear() < 1) return;
        row.since = d.getFullYear();
      }
      out.push(row);
    });
  });
  return json(out);
}

// ---- web app: actions from the portal ----
// The portal posts JSON as text/plain, which avoids a CORS preflight.
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'save') return json(saveDates(body));
    if (body.action === 'test') return json(sendTestMail(body.email));
    return json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

// Creates or updates the employee's row, matched by email.
function saveDates(b) {
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(email) || email.split('@')[1] !== DOMAIN) throw new Error(`Only @${DOMAIN} accounts can save dates`);

  let birthday = null;
  if (b.birthday) {
    const m = +b.birthday.m, d = +b.birthday.d;
    // Stored on year 2000 (a leap year, so 29 Feb works); only the day and month are used.
    birthday = new Date(2000, m - 1, d);
    if (!(m >= 1 && m <= 12 && d >= 1) || birthday.getMonth() !== m - 1) throw new Error('That birthday is not a real date');
  }
  let joined = null;
  if (b.joined) {
    const m = String(b.joined).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    joined = m && new Date(+m[1], +m[2] - 1, +m[3]);
    if (!joined || joined.getMonth() !== +m[2] - 1 || +m[1] < 1950 || joined > new Date()) throw new Error('Enter a joining date that is not in the future');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet();
    const col = ensureColumns(sheet);
    const last = sheet.getLastRow();
    const emails = last > 1 ? sheet.getRange(2, col.email, last - 1, 1).getValues().map((r) => String(r[0]).trim().toLowerCase()) : [];
    const found = emails.indexOf(email);
    const row = found >= 0 ? found + 2 : last + 1;
    const cell = (c) => sheet.getRange(row, c);
    const fillIfBlank = (c, v) => { if (v && !String(cell(c).getValue()).trim()) cell(c).setValue(String(v).slice(0, 100)); };

    if (found < 0) cell(col.email).setValue(email);
    fillIfBlank(col.name, b.name);
    fillIfBlank(col.department, b.dept);
    if (birthday) cell(col.birthday).setValue(birthday).setNumberFormat('d mmmm');
    else cell(col.birthday).clearContent();
    if (joined) cell(col['joining date']).setValue(joined).setNumberFormat('d mmm yyyy');
    else cell(col['joining date']).clearContent();
    cell(col['opt out']).insertCheckboxes().setValue(!!b.optOut);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

// ---- one-off helpers you run by hand from the editor ----
function createDailyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'sendDailyWishes')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendDailyWishes').timeBased().everyDays(1).atHour(8).create();
  Logger.log('Daily trigger set for 8–9 AM, ' + Session.getScriptTimeZone());
}

// Lists what the next 30 days look like, without sending anything.
function previewUpcoming() {
  const today = startOfDay(new Date());
  readEmployees().forEach((p) => {
    [['Birthday', p.birthday], ['Anniversary', p.joined]].forEach(([type, d]) => {
      if (!d) return;
      const next = nextOccurrence(d, today);
      const days = Math.round((next - today) / 864e5);
      if (days <= 30) Logger.log(`${type}: ${p.name} in ${days} day(s), ${next.toDateString()}`);
    });
  });
}

// ---- data ----
function getSheet() {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

// Adds any missing header columns and returns { 'name': 1, 'email': 2, ... } (1-based, lower-case keys).
function ensureColumns(sheet) {
  const width = Math.max(sheet.getLastColumn(), 1);
  const header = sheet.getRange(1, 1, 1, width).getValues()[0].map((h) => String(h).trim());
  while (header.length && !header[header.length - 1]) header.pop();
  HEADERS.forEach((h) => { if (!header.some((x) => x.toLowerCase() === h.toLowerCase())) header.push(h); });
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  const col = {};
  header.forEach((h, i) => { col[h.toLowerCase()] = i + 1; });
  return col;
}

function readEmployees() {
  const sheet = getSheet();
  if (sheet.getLastRow() < 2) return [];
  const [header, ...rows] = sheet.getDataRange().getValues();
  const col = (name) => header.findIndex((h) => String(h).trim().toLowerCase() === name);
  const c = { name: col('name'), email: col('email'), dept: col('department'), birthday: col('birthday'), joined: col('joining date'), opt: col('opt out') };
  if (c.email < 0) throw new Error('The sheet needs an "Email" column');
  const asDate = (v) => (v instanceof Date && !isNaN(v) ? v : null);
  return rows
    .filter((r) => r[c.email] && !(c.opt >= 0 && r[c.opt] === true))
    .map((r) => {
      const email = String(r[c.email]).trim().toLowerCase();
      return {
        name: (c.name >= 0 && String(r[c.name]).trim()) || email.split('@')[0],
        email,
        dept: c.dept >= 0 ? String(r[c.dept]).trim() : '',
        birthday: c.birthday >= 0 ? asDate(r[c.birthday]) : null,
        joined: c.joined >= 0 ? asDate(r[c.joined]) : null,
      };
    });
}

// ---- dates ----
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// This year's date for a recurring day; Feb 29 falls on Feb 28 in non-leap years.
function onYear(d, year) {
  const leap = new Date(year, 1, 29).getMonth() === 1;
  const day = d.getMonth() === 1 && d.getDate() === 29 && !leap ? 28 : d.getDate();
  return new Date(year, d.getMonth(), day);
}

function isSameDay(d, today) {
  return onYear(d, today.getFullYear()).getTime() === today.getTime();
}

function nextOccurrence(d, today) {
  const t = onYear(d, today.getFullYear());
  return t < today ? onYear(d, today.getFullYear() + 1) : t;
}

function cleanOldSentKeys(props, keep) {
  Object.keys(props.getProperties())
    .filter((k) => k.startsWith('sent-') && k !== keep)
    .forEach((k) => props.deleteProperty(k));
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
