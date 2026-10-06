(() => {
  'use strict';

  // Only accounts on this Google Workspace domain can sign in.
  const DOMAIN = 'scube-ergo.com';
  const STORE_KEY = 'scube-learning-demo-v3';
  // Sample video every seeded course plays until real course videos are uploaded.
  const DEMO_VIDEO = { youtube: 'kuGjypoJKwk', secs: 56, label: 'ChatGPT Work, now powered by GPT-6 Astra (OpenAI, YouTube)' };
  // A course counts as completed once this share of it has been watched.
  const COMPLETE_AT = 90;
  const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const TONES = ['amber', 'teal', 'lilac', 'rose', 'sky', 'sand'];
  // Web app URL of apps-script/Celebrations.gs (Deploy → Web app). Empty = show sample dates.
  const CELEBRATIONS_URL = '';
  const CELEBRATE_DAYS = 30;

  // a = deep, b/c = thumbnail gradient, ink = text on thumbnail
  const THEMES = [
    { a: '#1f6f68', b: '#83c1bd', c: '#d0e9df', ink: '#123f3b' },
    { a: '#a4503a', b: '#f0a58f', c: '#fbe0d5', ink: '#6b2d1d' },
    { a: '#8a6514', b: '#f0c86d', c: '#fbeccb', ink: '#5c4508' },
    { a: '#554890', b: '#a69ad8', c: '#e4dff5', ink: '#342a66' },
    { a: '#2f6a93', b: '#8dbbe0', c: '#dcebf6', ink: '#1c4461' },
    { a: '#203f42', b: '#2a5256', c: '#5b9a90', ink: '#e7f5f0' },
    { a: '#8f4450', b: '#e5a3a8', c: '#f7dfe0', ink: '#5e2630' },
    { a: '#4f6833', b: '#a9c28a', c: '#e5eed9', ink: '#34461f' },
  ];

  const CATEGORIES = ['Foundations', 'Productivity', 'Sales', 'Policy', 'Design', 'Communication', 'Leadership', 'Operations'];

  const SEED_COURSES = [
    { id: 'c1', short: 'AI fundamentals', title: 'AI fundamentals for everyone', category: 'Foundations', theme: 0, ago: 40,
      desc: 'What modern AI can and cannot do, in plain language. Start here before any other course.',
      chapters: [
        ['What we mean by AI', ['Software that learns patterns from examples', 'Good at drafting, sorting and summarising', 'Not a search engine, and not always right']],
        ['How language models work', ['Text is split into small pieces called tokens', 'The model predicts the most likely next piece', 'Answers sound confident even when they are wrong']],
        ['Where AI helps at Scube', ['First drafts of emails and proposals', 'Summaries of long documents and calls', 'Explaining and cleaning spreadsheet data']],
        ['Limits you should know', ['It can invent facts, figures and sources', 'It does not know our latest prices or stock', 'A person always checks the final output']],
      ] },
    { id: 'c2', short: 'Prompting', title: 'Prompting that works', category: 'Productivity', theme: 3, ago: 35,
      desc: 'Write instructions that get useful answers the first time, with reusable templates for everyday tasks.',
      chapters: [
        ['Anatomy of a good prompt', ['Say who the answer is for', 'Give the context the model cannot guess', 'Describe the format you want back']],
        ['Show, don’t just tell', ['Paste one good example', 'Ask for three options, then pick one', 'Name what to avoid']],
        ['Improve it in conversation', ['Ask it to critique its own draft', 'Tighten length and tone step by step', 'Save prompts that work']],
        ['Templates for daily work', ['Meeting notes into an action list', 'Customer email into a reply draft', 'Long report into a one-page brief']],
      ] },
    { id: 'c3', short: 'Customer calls', title: 'AI for customer conversations', category: 'Sales', theme: 1, ago: 28,
      desc: 'Prepare for calls, answer enquiries faster and follow up well, without losing the personal touch.',
      chapters: [
        ['Before the call', ['Summarise the account history', 'List likely questions and objections', 'Draft a short agenda']],
        ['During and after', ['Capture notes, not full transcripts', 'Turn notes into a follow-up email', 'Log next steps in the CRM']],
        ['Answering enquiries', ['Draft replies from approved product info', 'Keep prices and dates human-checked', 'Match the customer’s tone']],
        ['What not to automate', ['Complaints and escalations', 'Commercial commitments', 'Anything shared in confidence']],
      ] },
    { id: 'c4', short: 'Safe data use', title: 'Using AI safely with company data', category: 'Policy', theme: 5, ago: 21, required: true,
      desc: 'Required for all employees. What you may and may not share with AI tools, and how to check what comes back.',
      chapters: [
        ['Why this matters', ['Anything you paste may be stored', 'Customer data is protected by law and contract', 'One careless paste can become a breach']],
        ['Green, amber and red data', ['Green: public info and general questions', 'Amber: internal docs, approved tools only', 'Red: customer personal data, pricing, passwords']],
        ['Approved tools', ['Use tools signed in with your Scube account', 'No personal AI accounts for work', 'Ask IT before trying a new tool']],
        ['Checking what comes back', ['Verify facts, numbers and names', 'Watch for copied third-party text', 'You own the result you send']],
      ] },
    { id: 'c5', short: 'Reports in Sheets', title: 'Automating reports with AI in Sheets', category: 'Productivity', theme: 7, ago: 14,
      desc: 'Use AI inside Google Sheets to clean data, write formulas and turn raw numbers into a weekly report.',
      chapters: [
        ['Cleaning messy data', ['Split, trim and standardise columns', 'Spot duplicates and blanks', 'Keep the original tab untouched']],
        ['Formulas in plain English', ['Describe the result you need', 'Ask for the formula and an explanation', 'Test it on five rows first']],
        ['From numbers to insight', ['Ask what changed week on week', 'Request a short written summary', 'Check every figure it quotes']],
        ['A repeatable weekly report', ['One template, refreshed each Monday', 'Charts that update themselves', 'Share a link, not an attachment']],
      ] },
    { id: 'c6', short: 'Design reviews', title: 'AI-assisted design reviews', category: 'Design', theme: 4, ago: 10,
      desc: 'Use AI to explore options, check consistency and write clearer design feedback, while designers keep the final call.',
      chapters: [
        ['Exploring options faster', ['Generate variations from a brief', 'Compare trade-offs side by side', 'Keep the brief in front of you']],
        ['Checking consistency', ['Spot mismatched sizes and labels', 'Compare against the spec sheet', 'Flag what needs a human look']],
        ['Better feedback', ['Turn scribbles into clear notes', 'Separate must-fix from nice-to-have', 'Link each note to a requirement']],
        ['Where judgement stays human', ['Comfort, safety and fit', 'Brand and customer feel', 'Final sign-off']],
      ] },
    { id: 'c7', short: 'Writing', title: 'Writing with AI: emails, docs, proposals', category: 'Communication', theme: 6, ago: 5,
      desc: 'Draft faster and edit better. Keep your own voice and make sure every claim is one you can stand behind.',
      chapters: [
        ['Start from an outline', ['Bullet the points you must make', 'Let AI draft, you decide the order', 'Cut anything you would not say aloud']],
        ['Editing, not just drafting', ['Ask for a shorter version', 'Ask what a sceptical reader would question', 'Fix tone for the audience']],
        ['Proposals and quotes', ['Reuse approved wording', 'Never let AI set a price', 'Check names, dates and numbers twice']],
        ['Your voice, your name', ['Read it once before sending', 'Remove filler and buzzwords', 'Sign only what you mean']],
      ] },
    { id: 'c8', short: 'Leading change', title: 'Leading teams through AI change', category: 'Leadership', theme: 2, ago: 2,
      desc: 'For managers. Help your team adopt AI with confidence: set expectations, share wins and handle concerns openly.',
      chapters: [
        ['Why people hesitate', ['Fear of being replaced', 'Worry about making mistakes', 'Not knowing where to start']],
        ['Set clear expectations', ['Say which tasks AI should help with', 'Say which tasks stay human', 'Share the data rules early']],
        ['Make progress visible', ['Celebrate small time savings', 'Share prompts that worked', 'Give time to learn during work hours']],
        ['Measure what matters', ['Course completion across the team', 'Hours saved on routine work', 'Quality of the final output']],
      ] },
  ];

  // id, name, department, role, hours since last active, % watched per course (c1..c8)
  const SEED_USERS = [
    ['admin', 'Admin', 'Administration', 'admin', 1, [10, 80, 0, 20, 40, 0, 60, 20]],
    ['raghu', 'Raghu', 'Scube Ergo', 'employee', 0.3, [100, 100, 65, 100, 90, 40, 100, 0]],
    ['sneha', 'Sneha', 'Scube Ergo', 'employee', 26, [60, 30, 0, 0, 0, 0, 75, 0]],
  ];

  // ---------- state ----------
  function seedState() {
    const now = Date.now();
    const secs = DEMO_VIDEO.secs;
    const courses = SEED_COURSES.map((c) => ({
      id: c.id, short: c.short, title: c.title, category: c.category, duration: secs, theme: c.theme,
      required: !!c.required, desc: c.desc, uploadedAt: now - c.ago * DAY, uploadedBy: 'admin', file: null,
      youtube: DEMO_VIDEO.youtube, videoLabel: DEMO_VIDEO.label,
      chapters: c.chapters.map(([t, points], i, all) => ({ t, points, at: Math.round((i * secs) / all.length) })),
    }));
    const users = SEED_USERS.map(([id, name, dept, role], i) => ({ id, name, email: `${id}@${DOMAIN}`, dept, role, tone: TONES[i % TONES.length] }));
    const progress = {};
    const events = [];
    SEED_USERS.forEach(([id, , , , lastH, pcts]) => {
      progress[id] = {};
      const touched = pcts.map((p, i) => ({ p, i })).filter((x) => x.p > 0);
      // the most recently touched course is an unfinished one where possible
      touched.sort((a, b) => (b.p < 100) - (a.p < 100) || b.i - a.i);
      touched.forEach((x, rank) => {
        const c = courses[x.i];
        const w = Math.round((c.duration * x.p) / 100);
        const last = now - lastH * HOUR - rank * 19 * HOUR;
        progress[id][c.id] = { ranges: [[0, w]], pos: x.p >= 100 ? 0 : w, last, done: x.p >= COMPLETE_AT };
        events.push({ user: id, course: c.id, type: x.p >= COMPLETE_AT ? 'completed' : 'watched', at: last });
      });
    });
    courses.slice(-2).forEach((c) => events.push({ user: 'admin', course: c.id, type: 'published', at: c.uploadedAt }));
    events.sort((a, b) => b.at - a.at);
    return { v: 3, users, courses, progress, events: events.slice(0, 60), session: null };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.v === 3 && Array.isArray(s.users) && Array.isArray(s.courses)) return s;
      }
    } catch (e) { /* storage unavailable: fall back to seed data */ }
    return seedState();
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* demo still works in memory */ }
  }

  let S = load();
  const FILES = new Map(); // courseId -> blob URL of an uploaded video (this session only)
  let view = null;
  let libFilter = 'All';
  let peopleQuery = '';
  let peopleDept = 'All';
  let pendingUpload = null;
  let P = null; // active player
  // YouTube embeds refuse to play from a file:// page, and some hosts block them entirely.
  let ytFailed = location.protocol === 'file:' ? 'file' : '';
  let ytApi = null;

  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytApi) return ytApi;
    ytApi = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 8000);
      window.onYouTubeIframeAPIReady = () => { clearTimeout(timer); resolve(); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => { clearTimeout(timer); reject(new Error('blocked')); };
      document.head.appendChild(s);
    });
    return ytApi;
  }

  function youtubeFailed() {
    if (ytFailed) return;
    ytFailed = 'blocked';
    if (P && P.mode === 'yt') renderApp();
  }

  function playerMode(c) {
    if (FILES.has(c.id)) return 'video';
    if (c.youtube && !ytFailed) return 'yt';
    return 'sim';
  }

  function parseYouTube(url) {
    const m = String(url).trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
    return m ? m[1] : null;
  }

  // The real length is only known once the player loads; rescale saved progress so percentages hold.
  function setDuration(c, secs) {
    if (!secs || Math.abs(secs - c.duration) < 1) return;
    const f = secs / c.duration;
    Object.values(S.progress).forEach((p) => {
      const pr = p[c.id];
      if (!pr) return;
      pr.ranges = pr.ranges.map(([a, b]) => [Math.round(a * f * 10) / 10, Math.round(b * f * 10) / 10]);
      pr.pos = Math.round(pr.pos * f * 10) / 10;
    });
    c.chapters.forEach((ch) => { ch.at = Math.round(ch.at * f); });
    c.duration = secs;
    if (P && P.c === c) { P.t *= f; P.rangesKey = ''; }
    save();
  }

  // ---------- helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const initials = (n) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const firstName = (n) => n.split(/\s+/)[0];
  const userById = (id) => S.users.find((u) => u.id === id);
  const courseById = (id) => S.courses.find((c) => c.id === id);
  const me = () => (S.session ? userById(S.session) : null);
  const byNewest = (a, b) => b.uploadedAt - a.uploadedAt;
  const watchedSecs = (ranges) => ranges.reduce((s, [a, b]) => s + (b - a), 0);

  function pctOf(uid, c) {
    const p = S.progress[uid] && S.progress[uid][c.id];
    if (!p) return 0;
    return Math.min(100, Math.round((watchedSecs(p.ranges) / c.duration) * 100));
  }

  function userStats(uid) {
    let total = 0, watched = 0, done = 0, inProgress = 0, last = 0;
    S.courses.forEach((c) => {
      total += c.duration;
      const p = S.progress[uid] && S.progress[uid][c.id];
      if (p) { watched += Math.min(c.duration, watchedSecs(p.ranges)); last = Math.max(last, p.last || 0); }
      const pct = pctOf(uid, c);
      if (pct >= COMPLETE_AT) done++; else if (pct > 0) inProgress++;
    });
    return { pct: total ? Math.round((watched / total) * 100) : 0, watched, done, inProgress, last, total };
  }

  function courseStats(c) {
    const ps = S.users.map((u) => pctOf(u.id, c));
    return {
      avg: ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : 0,
      done: ps.filter((p) => p >= COMPLETE_AT).length,
      started: ps.filter((p) => p > 0).length,
    };
  }

  function addRange(r, a, b) {
    r.push([a, b]);
    r.sort((x, y) => x[0] - y[0]);
    const out = [];
    r.forEach(([s, e]) => {
      const l = out[out.length - 1];
      if (l && s <= l[1] + 0.3) l[1] = Math.max(l[1], e);
      else out.push([s, e]);
    });
    r.length = 0;
    out.forEach(([s, e]) => r.push([Math.round(s * 10) / 10, Math.round(e * 10) / 10]));
  }

  function logEvent(user, course, type) {
    if (type === 'watched') S.events = S.events.filter((e) => !(e.user === user && e.course === course && e.type === 'watched'));
    S.events.unshift({ user, course, type, at: Date.now() });
    S.events = S.events.slice(0, 60);
  }

  const fmtClock = (s) => {
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    const mm = h ? String(m).padStart(2, '0') : String(m);
    return `${h ? h + ':' : ''}${mm}:${String(r).padStart(2, '0')}`;
  };
  const fmtDur = (s) => {
    if (s > 0 && s < 60) return '< 1 min';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h} h ${r} min` : `${h} h`;
  };
  const fmtRel = (ts) => {
    if (!ts) return 'Never';
    const d = Date.now() - ts;
    if (d < MIN) return 'Just now';
    if (d < HOUR) return `${Math.floor(d / MIN)} min ago`;
    if (d < DAY) return `${Math.floor(d / HOUR)} h ago`;
    if (d < 2 * DAY) return 'Yesterday';
    return `${Math.floor(d / DAY)} days ago`;
  };
  const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const todayLabel = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
  const heatClass = (p) => (p <= 0 ? 'h0' : p < 25 ? 'h1' : p < 50 ? 'h2' : p < 75 ? 'h3' : p < COMPLETE_AT ? 'h4' : 'h5');

  const avatar = (u, size = '') => `<span class="avatar avatar-${u.tone} ${size}">${esc(initials(u.name))}</span>`;
  const bar = (p) => `<span class="bar"><span style="width:${p}%"></span></span>`;

  function statusChip(p) {
    if (p >= COMPLETE_AT) return '<span class="chip chip-done">✓ Completed</span>';
    if (p > 0) return '<span class="chip chip-prog">◷ In progress</span>';
    return '<span class="chip chip-none">○ Not started</span>';
  }

  function ring(p, label, size = '') {
    return `<div class="ring ${size}" style="--p:${p}" role="img" aria-label="${p}% ${esc(label)}"><div class="ring-inner"><strong class="tnum">${p}%</strong><small>${esc(label)}</small></div></div>`;
  }

  function thumb(c) {
    const t = THEMES[c.theme % THEMES.length];
    return `<span class="thumb" style="--t1:${t.b};--t2:${t.c};--tink:${t.ink}"><span class="thumb-code">AI</span><span class="play-button">▶</span><span class="thumb-dur tnum">${fmtClock(c.duration)}</span></span>`;
  }

  const isNew = (c) => Date.now() - c.uploadedAt < 7 * DAY;

  // ---------- celebrations ----------
  // Sample dates sit relative to today so the demo always has something to show: [user, type, in days, years].
  const SAMPLE_CELEBRATIONS = [['sneha', 'birthday', 0], ['raghu', 'anniversary', 6, 3], ['admin', 'birthday', 19], ['sneha', 'anniversary', 26, 1]];
  let celebrations = { source: CELEBRATIONS_URL ? 'loading' : 'sample', items: [] };

  const startOfToday = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const fmtDay = (ts) => new Date(ts).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const whenLabel = (days) => (days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`);

  // Next date a day/month recurs; Feb 29 falls on Feb 28 in non-leap years (same rule as the Apps Script).
  function nextOccurrence(month, day) {
    const t = startOfToday();
    const on = (y) => new Date(y, month - 1, month === 2 && day === 29 && new Date(y, 1, 29).getMonth() !== 1 ? 28 : day);
    const d = on(t.getFullYear());
    return d < t ? on(t.getFullYear() + 1) : d;
  }

  // Offline rows in the same shape as the Apps Script feed: dates people saved on their profile,
  // plus sample dates for anyone who hasn't saved theirs yet.
  function localCelebrationRows() {
    const t = startOfToday();
    const rows = [];
    const row = (u, type, month, day, since) => rows.push({ type, name: u.name, email: u.email, dept: u.dept, month, day, since });
    S.users.forEach((u) => {
      if (u.optOut) return;
      if (u.birthday) row(u, 'birthday', u.birthday.m, u.birthday.d);
      if (u.joined) { const [y, m, d] = u.joined.split('-').map(Number); row(u, 'anniversary', m, d, y); }
    });
    SAMPLE_CELEBRATIONS.forEach(([id, type, days, years]) => {
      const u = userById(id);
      if (!u || u.optOut || (type === 'birthday' ? u.birthday : u.joined)) return;
      const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + days);
      row(u, type, d.getMonth() + 1, d.getDate(), d.getFullYear() - (years || 0));
    });
    return rows;
  }

  function celebrationItems() {
    const t = startOfToday();
    const rows = celebrations.source === 'sample' ? localCelebrationRows() : celebrations.items;
    return rows.map((r) => {
      const date = nextOccurrence(r.month, r.day);
      return { type: r.type, name: r.name, email: r.email, dept: r.dept, date: date.getTime(), days: Math.round((date - t) / DAY),
        years: r.type === 'anniversary' ? date.getFullYear() - r.since : null };
    })
      .filter((x) => x.days <= CELEBRATE_DAYS && (x.type === 'birthday' || x.years > 0))
      .sort((a, b) => a.days - b.days || a.name.localeCompare(b.name));
  }

  // The portal posts JSON as text/plain so the browser skips the CORS preflight Apps Script can't answer.
  function callCelebrations(payload) {
    return fetch(CELEBRATIONS_URL, { method: 'POST', body: JSON.stringify(payload) })
      .then((r) => { if (!r.ok) throw new Error(`the server answered ${r.status}`); return r.json(); })
      .then((res) => { if (!res || !res.ok) throw new Error((res && res.error) || 'the request failed'); return res; });
  }

  function loadCelebrations() {
    if (!CELEBRATIONS_URL) return;
    fetch(CELEBRATIONS_URL)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((rows) => {
        const items = (Array.isArray(rows) ? rows : [])
          .filter((r) => r && r.name && r.month && r.day && (r.type === 'birthday' || r.type === 'anniversary'))
          .map((r) => ({ type: r.type, name: String(r.name), email: String(r.email || '').toLowerCase(), dept: String(r.dept || ''), month: +r.month, day: +r.day, since: +r.since || 0 }));
        celebrations = { source: 'live', items };
      })
      .catch(() => { celebrations = { source: 'error', items: [] }; })
      .then(() => { if (me() && view && (view.name === 'home' || view.name === 'overview')) renderApp(); });
  }

  function celebrationsPanel(u) {
    const list = celebrationItems();
    let body;
    if (celebrations.source === 'loading') body = '<p class="muted">Loading upcoming celebrations…</p>';
    else if (celebrations.source === 'error') body = '<p class="muted">Couldn’t load celebrations from the employee directory. Try again later.</p>';
    else if (!list.length) body = `<p class="muted">No birthdays or work anniversaries in the next ${CELEBRATE_DAYS} days.</p>`;
    else {
      body = `<div class="celebrate-list">${list.map((x) => {
        const person = S.users.find((p) => p.email === x.email) || { name: x.name, tone: TONES[x.name.length % TONES.length] };
        const what = x.type === 'birthday' ? '🎂 Birthday' : `🎉 ${x.years}-year work anniversary`;
        return `<div class="celebrate-row${x.days === 0 ? ' today' : ''}">${avatar(person)}
          <div class="activity-copy"><strong>${esc(x.name)}${x.email === u.email ? ' (you)' : ''}</strong><span>${what}${x.dept ? ` · ${esc(x.dept)}` : ''}</span></div>
          <span class="celebrate-when"><b>${whenLabel(x.days)}</b><small>${fmtDay(x.date)}</small></span></div>`;
      }).join('')}</div>`;
    }
    const note = celebrations.source === 'sample' && u.role === 'admin'
      ? '<p class="fine celebrate-note">Includes sample dates. Paste the Apps Script web app URL into CELEBRATIONS_URL in app.js to use the employee directory sheet.</p>' : '';
    const actions = [
      celebrations.source === 'sample' ? '<span class="tag">Sample dates</span>' : '',
      u.role === 'admin' ? '<button class="text-button" data-act="test-mail">Send test email <span>✉</span></button>' : '',
      '<button class="text-button" data-go="profile">Add your dates <span>↗</span></button>',
    ].join('');
    return `<article class="panel">
      <div class="panel-heading"><div><div class="eyebrow">Next ${CELEBRATE_DAYS} days</div><h2>Upcoming celebrations</h2></div><div class="celebrate-actions">${actions}</div></div>
      ${body}${note}
    </article>`;
  }

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  function datesPanel(u) {
    const b = u.birthday || {};
    return `<section class="panel">
      <div class="panel-heading"><div><div class="eyebrow">Celebrations</div><h2>Birthday & work anniversary</h2>
        <p>On these days everyone at Scube gets an email wishing you well, and you show up in Upcoming celebrations. Only the day and month of your birthday are shared, never the year.</p></div></div>
      <form id="dates-form" class="form-grid" novalidate>
        <div class="field"><label for="bd-day">Birthday</label><div class="inline-field">
          <select id="bd-day" aria-label="Birthday day"><option value="">Day</option>${Array.from({ length: 31 }, (_, i) => `<option ${b.d === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select>
          <select id="bd-month" aria-label="Birthday month"><option value="">Month</option>${MONTHS.map((m, i) => `<option value="${i + 1}" ${b.m === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>
        </div></div>
        <div class="field"><label for="joined">Joining date at Scube</label><input id="joined" type="date" min="1950-01-01" max="${isoDate(startOfToday())}" value="${esc(u.joined || '')}" /></div>
        <label class="check full" for="opt-out"><input id="opt-out" type="checkbox" ${u.optOut ? 'checked' : ''} /> Don’t celebrate me (no company email, not shown on the dashboard)</label>
        <p class="field-error full" id="dates-error" hidden></p>
        <div class="modal-actions full"><button type="submit" class="primary-button" id="dates-save">Save dates</button></div>
      </form>
    </section>`;
  }

  function saveDates() {
    const u = me();
    const fail = (m) => { const err = $('#dates-error'); if (err) { err.textContent = m; err.hidden = false; } };
    const d = +$('#bd-day').value, m = +$('#bd-month').value;
    if (!d !== !m) return fail('Pick both the day and the month of your birthday, or leave both empty.');
    if (d && new Date(2000, m - 1, d).getMonth() !== m - 1) return fail(`${MONTHS[m - 1]} doesn’t have ${d} days.`);
    const joined = $('#joined').value;
    if (joined && (joined > isoDate(startOfToday()) || joined < '1950-01-01')) return fail('Enter a joining date that isn’t in the future.');
    const patch = { birthday: d ? { m, d } : null, joined: joined || null, optOut: $('#opt-out').checked };
    const apply = () => {
      Object.assign(u, patch);
      save();
      if (view && view.name === 'profile') renderApp();
      toast(patch.optOut ? 'Saved. You won’t be celebrated.' : 'Your dates are saved');
    };
    if (!CELEBRATIONS_URL) { apply(); return; }
    const btn = $('#dates-save');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    callCelebrations({ action: 'save', email: u.email, name: u.name, dept: u.dept, ...patch })
      .then(() => { apply(); loadCelebrations(); })
      .catch((e) => { fail(`Couldn’t save to the employee directory: ${e.message}.`); if (btn.isConnected) { btn.disabled = false; btn.textContent = 'Save dates'; } });
  }

  function testMailModal() {
    return `<div class="modal-head"><div><div class="eyebrow">Celebrations</div><h2>Send a test email</h2></div><button class="x" data-act="close" aria-label="Close">×</button></div>
      <form id="test-form" novalidate style="display:flex;flex-direction:column;gap:16px">
        <p class="muted">Sends the next upcoming birthday or work anniversary right now, exactly as team@${DOMAIN} will get it on the day, but marked [TEST] and only to the address below. If nobody has saved dates yet, it sends samples.</p>
        <div class="field"><label for="test-email">Send to</label><input id="test-email" type="email" value="${esc(me().email)}" autocomplete="off" /></div>
        <p class="reach-note">${CELEBRATIONS_URL
          ? 'For safety, the Apps Script only sends test emails to addresses listed in ADMINS.'
          : 'Not connected yet. Paste the Apps Script web app URL into CELEBRATIONS_URL in app.js. Until then, run sendTestMail from the Apps Script editor.'}</p>
        <p class="field-error" id="test-error" hidden></p>
        <div class="modal-actions"><button type="button" class="ghost-button" data-act="close">Cancel</button><button type="submit" class="primary-button" id="test-send" ${CELEBRATIONS_URL ? '' : 'disabled'}>Send test email</button></div>
      </form>`;
  }

  function sendTestMail() {
    const fail = (m) => { const err = $('#test-error'); if (err) { err.textContent = m; err.hidden = false; } };
    const email = $('#test-email').value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+$/.test(email) || email.split('@')[1] !== DOMAIN) return fail(`Enter an @${DOMAIN} address.`);
    const btn = $('#test-send');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    callCelebrations({ action: 'test', email })
      .then((res) => {
        closeModal();
        toast(res.real ? `Sent the ${res.forDate} celebration to ${email} as a test` : `No saved dates yet, so sample test emails were sent to ${email}`);
      })
      .catch((e) => { fail(`Couldn’t send: ${e.message}`); if (btn.isConnected) { btn.disabled = false; btn.textContent = 'Send test email'; } });
  }

  // Greeting shown on your own home page on your birthday or work anniversary.
  function celebrationBanner(u) {
    return celebrationItems().filter((x) => x.days === 0 && x.email === u.email).map((x) => `<div class="celebrate-banner">${x.type === 'birthday'
      ? `🎂 Happy birthday, ${esc(firstName(u.name))}! Everyone at Scube wishes you a wonderful day.`
      : `🎉 Happy ${x.years}-year work anniversary, ${esc(firstName(u.name))}! Thank you for being part of Scube.`}</div>`).join('');
  }

  // ---------- toast & tooltip ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function showTip(el) {
    const tip = $('#tip');
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    const top = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }
  const hideTip = () => { $('#tip').hidden = true; };

  // ---------- routing ----------
  const ADMIN_ONLY = ['overview', 'manage', 'people'];

  function go(name, param) {
    view = { name, param };
    renderApp();
    window.scrollTo(0, 0);
  }

  function renderApp() {
    stopPlayer();
    hideTip();
    const u = me();
    const app = $('#app');
    if (!u) { app.innerHTML = loginView(); return; }
    if (!view || !VIEWS[view.name] || (ADMIN_ONLY.includes(view.name) && u.role !== 'admin')) {
      view = { name: u.role === 'admin' ? 'overview' : 'home' };
    }
    app.innerHTML = shell(u, VIEWS[view.name](u, view.param));
    if (view.name === 'watch' && courseById(view.param)) startPlayer(u, view.param);
  }

  // ---------- login ----------
  function loginView() {
    const total = S.courses.reduce((s, c) => s + c.duration, 0);
    return `<div class="login">
      <section class="login-art">
        <div class="orbit o1"></div><div class="orbit o2"></div>
        <div class="brand-lockup light"><div class="brand-mark">S</div><div><div class="brand-name">scube</div><div class="brand-caption">learning portal</div></div></div>
        <div class="login-copy">
          <div class="eyebrow on-dark">For every Scube employee</div>
          <h1>Learn to work with <em>AI</em>, at your own pace.</h1>
          <p>Short video courses made for Scube teams. Your progress saves to your profile, so you can pick up exactly where you left off.</p>
        </div>
        <div class="login-stats">
          <div><strong class="tnum">${S.courses.length}</strong><span>AI video courses</span></div>
          <div><strong class="tnum">${fmtDur(total)}</strong><span>of video</span></div>
          <div><strong class="tnum">${S.users.length}</strong><span>employees enrolled</span></div>
        </div>
      </section>
      <section class="login-panel">
        <div class="login-card">
          <h2>Sign in</h2>
          <p class="muted">Use your Scube Google Workspace account. No separate password needed.</p>
          <button class="google-btn" data-act="google"><span class="g-badge">G</span>Continue with Google Workspace</button>
          <div class="domain-note">Only <b>@${DOMAIN}</b> accounts can sign in. Personal Gmail and other accounts are turned away.</div>
          <p class="fine">Demo build: you pick a sample account instead of going through Google.</p>
        </div>
      </section>
    </div>`;
  }

  function chooserModal() {
    const list = [...S.users].sort((a, b) => (a.role === 'admin' ? -1 : 0) - (b.role === 'admin' ? -1 : 0));
    return `<div class="modal-head"><div><div class="eyebrow">Demo sign-in</div><h2>Choose an account</h2></div><button class="x" data-act="close" aria-label="Close">×</button></div>
      <p class="fine">In the live portal this step is Google's own sign-in page, limited to @${DOMAIN} accounts.</p>
      <div class="acct-list">${list.map((u) => `<button class="acct" data-act="pick" data-id="${u.id}">${avatar(u)}<span class="acct-text"><strong>${esc(u.name)}</strong><small>${esc(u.email)}</small></span><span class="role-chip ${u.role}">${u.role === 'admin' ? 'Admin' : 'Employee'}</span></button>`).join('')}</div>
      <form class="other-acct" id="other-form" novalidate>
        <label for="other-email">Or try any email</label>
        <div class="inline-field"><input id="other-email" type="email" placeholder="name@${DOMAIN}" autocomplete="off" /><button class="ghost-button" type="submit">Continue</button></div>
        <p class="field-error" id="other-error" hidden></p>
      </form>`;
  }

  function signInOther(email) {
    const err = $('#other-error');
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    email = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Enter a full email address, like name@' + DOMAIN + '.');
    const domain = email.split('@')[1];
    if (domain !== DOMAIN) return fail(`Access denied for @${domain}. Only @${DOMAIN} Google Workspace accounts can sign in.`);
    let u = S.users.find((x) => x.email === email);
    if (!u) {
      const local = email.split('@')[0];
      const name = local.split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') || local;
      u = { id: 'u' + Date.now().toString(36), name, email, dept: 'New joiner', role: 'employee', tone: TONES[S.users.length % TONES.length] };
      S.users.push(u);
      S.progress[u.id] = {};
    }
    login(u.id);
  }

  function login(id) {
    S.session = id;
    save();
    closeModal();
    view = null;
    renderApp();
    toast(`Signed in as ${userById(id).name}`);
  }

  // ---------- shell ----------
  function navGroups(u) {
    const learning = [['library', 'Course library', '▷'], ['profile', 'My profile', '◎']];
    if (u.role === 'admin') {
      return [
        ['Admin', [['overview', 'Overview', '◈'], ['manage', 'Manage courses', '▤'], ['people', 'People & progress', '⌁']]],
        ['My learning', learning],
      ];
    }
    return [['My learning', [['home', 'Home', '⌂'], ...learning]]];
  }

  const PAGE_NAMES = { overview: 'Overview', manage: 'Manage courses', people: 'People & progress', home: 'Home', library: 'Course library', profile: 'My profile', watch: 'Course library' };

  function shell(u, content) {
    const active = view.name === 'watch' ? 'library' : view.name;
    const nav = navGroups(u).map(([label, items]) => `<div class="nav-group"><div class="nav-label">${label}</div>${items.map(([key, name, icon]) => `<button class="nav-item ${active === key ? 'active' : ''}" data-go="${key}"${active === key ? ' aria-current="page"' : ''}><span class="nav-icon">${icon}</span>${name}${key === 'library' ? `<span class="nav-badge">${S.courses.length}</span>` : ''}</button>`).join('')}</div>`).join('');
    const course = view.name === 'watch' ? courseById(view.param) : null;
    return `<div class="app-shell">
      <aside class="sidebar" aria-label="Primary navigation">
        <div class="brand-lockup"><div class="brand-mark">S</div><div><div class="brand-name">scube</div><div class="brand-caption">learning portal</div></div></div>
        <nav class="nav">${nav}</nav>
        <div class="sidebar-bottom">
          <div class="sso-card"><strong>Google Workspace sign-in</strong>Signed in as ${esc(u.email)}</div>
          <button class="user-menu" data-act="account">${avatar(u)}<span class="user-details"><strong>${esc(u.name)}</strong><small>${u.role === 'admin' ? 'Administrator' : esc(u.dept)}</small></span><span class="more">•••</span></button>
        </div>
      </aside>
      <main class="main-content">
        <header class="topbar">
          <div class="breadcrumb"><span>${u.role === 'admin' ? 'Admin' : 'Learning'}</span><span class="slash">/</span><strong>${PAGE_NAMES[view.name]}</strong>${course ? `<span class="slash">/</span><span>${esc(course.title)}</span>` : ''}</div>
          <div class="top-actions">
            <span class="demo-pill">Demo data</span>
            <button class="avatar-button" data-act="account" aria-label="Account menu">${avatar(u)}</button>
          </div>
        </header>
        <section class="page-content" id="page">${content}</section>
      </main>
    </div>`;
  }

  function accountModal() {
    const u = me();
    return `<div class="modal-head"><div class="acct-card">${avatar(u, 'lg')}<div><strong>${esc(u.name)}</strong><small>${esc(u.email)} · ${u.role === 'admin' ? 'Administrator' : 'Employee'}</small></div></div><button class="x" data-act="close" aria-label="Close">×</button></div>
      <div class="menu-list">
        <button class="menu-item" data-act="google"><strong>Switch account</strong><span>Sign in as another sample employee or the admin</span></button>
        <button class="menu-item" data-act="reset"><strong>Reset demo data</strong><span>Restore the sample courses and progress</span></button>
        <button class="menu-item" data-act="signout"><strong>Sign out</strong><span>Return to the sign-in page</span></button>
      </div>`;
  }

  // ---------- employee views ----------
  function continueCourse(uid) {
    const withP = S.courses.map((c) => ({ c, p: pctOf(uid, c), last: (S.progress[uid] && S.progress[uid][c.id] && S.progress[uid][c.id].last) || 0 }));
    const inProg = withP.filter((x) => x.p > 0 && x.p < COMPLETE_AT).sort((a, b) => b.last - a.last);
    if (inProg.length) return inProg[0];
    const fresh = withP.filter((x) => x.p === 0).sort((a, b) => (b.c.required - a.c.required) || byNewest(a.c, b.c));
    return fresh[0] || null;
  }

  function courseCard(u, c) {
    const p = pctOf(u.id, c);
    const left = c.duration * (1 - p / 100);
    const state = p >= COMPLETE_AT ? ['✓ Completed', fmtDur(c.duration)] : p > 0 ? [`${p}% watched`, `${fmtDur(left)} left`] : ['Not started', fmtDur(c.duration)];
    return `<button class="course-card" data-go="watch" data-param="${c.id}">
      ${thumb(c)}
      <span class="cc-body">
        <span class="cc-tags">${c.required ? '<span class="tag tag-req">Required</span>' : ''}${isNew(c) ? '<span class="tag tag-new">New</span>' : ''}<span class="tag">${esc(c.category)}</span></span>
        <span class="cc-title">${esc(c.title)}</span>
        ${bar(p)}
        <span class="cc-meta tnum"><span>${state[0]}</span><span>${state[1]}</span></span>
      </span>
    </button>`;
  }

  function homeView(u) {
    const st = userStats(u.id);
    const next = continueCourse(u.id);
    let feature;
    if (next) {
      const { c, p } = next;
      const ch = c.chapters.filter((x) => x.at <= (((S.progress[u.id] || {})[c.id] || {}).pos || 0)).pop() || c.chapters[0];
      feature = `<article class="feature-card"><div class="orbit o1"></div><div class="orbit o2"></div><div class="feature-content">
        <div class="card-kicker"><span class="status-pill">${p > 0 ? 'CONTINUE WATCHING' : 'UP NEXT'}</span><span class="muted-label">${esc(c.category)} · ${fmtDur(c.duration)}</span></div>
        <h2>${esc(c.title)}</h2>
        <p>${p > 0 && ch ? `You stopped in chapter ${c.chapters.indexOf(ch) + 1}: ${esc(ch.t)}.` : esc(c.desc)}</p>
        <div class="feature-progress">${bar(p)}<small class="tnum">${p}% watched · ${fmtDur(c.duration * (1 - p / 100))} left</small></div>
        <button class="meet-button" data-go="watch" data-param="${c.id}">${p > 0 ? 'Resume' : 'Start course'} ▶</button>
      </div></article>`;
    } else {
      feature = `<article class="feature-card"><div class="orbit o1"></div><div class="orbit o2"></div><div class="feature-content">
        <div class="card-kicker"><span class="status-pill">ALL CAUGHT UP</span></div>
        <h2>You have completed every course.</h2><p>New courses appear here as soon as they are published.</p>
        <button class="meet-button" data-go="profile">View your profile</button></div></article>`;
    }
    const req = S.courses.filter((c) => c.required);
    const reqDone = req.filter((c) => pctOf(u.id, c) >= COMPLETE_AT).length;
    const reqCard = req.length ? `<article class="metric-card">
        <div class="metric-head"><span>Required courses</span><span class="${reqDone === req.length ? 'status-good' : 'status-crit'}">${reqDone === req.length ? '✓ All done' : `● ${req.length - reqDone} to finish`}</span></div>
        <div class="metric-number tnum">${reqDone}<span>/${req.length}</span></div>
        <div class="metric-sub">required courses completed</div>
        <ul class="req-list">${req.map((c) => `<li><button data-go="watch" data-param="${c.id}"><span class="req-title">${esc(c.title)}</span>${statusChip(pctOf(u.id, c))}</button></li>`).join('')}</ul>
      </article>` : `<article class="metric-card"><div class="metric-head"><span>Required courses</span></div><p class="metric-sub">No required courses right now.</p></article>`;

    const order = [...S.courses].sort((a, b) => {
      const rank = (c) => { const p = pctOf(u.id, c); return p > 0 && p < COMPLETE_AT ? 0 : p === 0 ? 1 : 2; };
      return rank(a) - rank(b) || byNewest(a, b);
    }).slice(0, 6);

    return `${celebrationBanner(u)}<div class="page-heading">
        <div><div class="eyebrow"><span class="live-dot"></span>${todayLabel()}</div>
        <h1>${greeting()}, ${esc(firstName(u.name))}<span class="accent-dot">.</span></h1>
        <p class="heading-copy">${st.pct >= 100 ? 'You have watched every course in the library.' : `You have watched ${st.pct}% of the AI course library so far.`}</p></div>
        <button class="primary-button" data-go="library"><span>▷</span> Browse all courses</button>
      </div>
      <section class="hero-grid">
        ${feature}
        <article class="metric-card">
          <div class="metric-head"><span>Profile completion</span><button class="text-button" data-go="profile">View profile <span>↗</span></button></div>
          <div class="ring-row">${ring(st.pct, 'watched')}<div class="ring-legend"><span><b class="tnum">${st.done}</b> of ${S.courses.length} courses completed</span><span><b class="tnum">${fmtDur(st.watched)}</b> of video watched</span></div></div>
          <p class="metric-sub">Share of all course video you have watched. Your admin sees the same number.</p>
        </article>
        ${reqCard}
      </section>
      ${celebrationsPanel(u)}
      <section>
        <div class="section-head"><h2>Your courses</h2><button class="text-button" data-go="library">See all ${S.courses.length} <span>↗</span></button></div>
        <div class="course-grid">${order.map((c) => courseCard(u, c)).join('')}</div>
      </section>`;
  }

  function libraryView(u) {
    const cats = ['All', ...new Set(S.courses.map((c) => c.category))];
    if (!cats.includes(libFilter)) libFilter = 'All';
    const list = S.courses.filter((c) => libFilter === 'All' || c.category === libFilter).sort(byNewest);
    return `<div class="page-heading"><div><div class="eyebrow">Newest first</div><h1>Course library</h1>
        <p class="heading-copy">${S.courses.length} AI video courses. New courses show up here for everyone as soon as they are published.</p></div></div>
      <div class="chip-row" role="group" aria-label="Filter by category">${cats.map((c) => `<button class="filter-chip" data-act="cat" data-cat="${esc(c)}" aria-pressed="${c === libFilter}">${esc(c)}</button>`).join('')}</div>
      <div class="course-grid">${list.map((c) => courseCard(u, c)).join('')}</div>`;
  }

  function watchView(u, cid) {
    const c = courseById(cid);
    if (!c) return `<div class="panel"><h2>This course is no longer available</h2><p class="muted">It may have been removed by an admin.</p><p style="margin-top:14px"><button class="primary-button" data-go="library">Back to library</button></p></div>`;
    const p = pctOf(u.id, c);
    const mode = playerMode(c);
    const uploader = userById(c.uploadedBy);
    const speeds = mode === 'yt' ? [1, 1.5, 2] : [1, 2, 4, 16];
    const ytLink = c.youtube ? `https://youtu.be/${c.youtube}` : '';
    let note = '';
    if (mode === 'sim' && c.youtube) {
      note = ytFailed === 'file'
        ? 'YouTube videos only play when the portal runs from a local server, not when index.html is opened as a file. A placeholder lesson plays instead.'
        : 'YouTube can’t play inside this page, so a placeholder lesson plays instead.';
      note += ` <a href="${ytLink}" target="_blank" rel="noopener">Watch the video on YouTube ↗</a>`;
    } else if (mode === 'sim' && c.file) {
      note = `The uploaded file (${esc(c.file)}) isn't kept after a page reload in this demo, so a placeholder lesson plays instead.`;
    }
    return `<div><button class="text-button back" data-go="library">← Course library</button></div>
      <div class="watch-grid">
        <div class="player-col">
          <div class="player">
            ${mode === 'video' ? `<video id="vid" playsinline preload="metadata" src="${FILES.get(c.id)}"></video>`
              : mode === 'yt' ? '<div id="yt"></div>'
              : `<canvas id="stage" role="img" aria-label="Lesson video for ${esc(c.title)}"></canvas>`}
            <button class="big-play" id="big-play" data-act="play" aria-label="Play">▶</button>
          </div>
          <div class="controls">
            <button class="ctrl-play" id="ctrl-play" data-act="play" aria-label="Play">▶</button>
            <span class="clock tnum" id="clock">0:00 / ${fmtClock(c.duration)}</span>
            <div class="scrub" id="scrub" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="${c.duration}" aria-valuenow="0"><div class="scrub-watched" id="scrub-watched"></div><div class="scrub-head" id="scrub-head"></div></div>
            <label class="speed" for="speed">Speed <select id="speed">${speeds.map((s) => `<option value="${s}">${s}×${s === 16 ? ' (demo)' : ''}</option>`).join('')}</select></label>
          </div>
          <div class="scrub-legend"><span><i></i>Parts you have watched</span><span>Skipping ahead doesn't count toward your progress.</span></div>
          ${note ? `<div class="player-note">${note}</div>` : ''}
          <div class="watch-info">
            <div class="cc-tags">${c.required ? '<span class="tag tag-req">Required</span>' : ''}${isNew(c) ? '<span class="tag tag-new">New</span>' : ''}<span class="tag">${esc(c.category)}</span></div>
            <h1>${esc(c.title)}</h1>
            <p>${esc(c.desc)}</p>
            <div class="watch-meta">${fmtDur(c.duration)} · Published ${fmtDate(c.uploadedAt)}${uploader ? ` by ${esc(uploader.name)}` : ''}${c.youtube ? ` · Video: <a href="${ytLink}" target="_blank" rel="noopener">${esc(c.videoLabel || 'YouTube')}</a>` : ''}</div>
          </div>
        </div>
        <aside class="watch-side">
          <section class="panel">
            <div class="eyebrow">Your progress</div>
            <div class="wp-row"><div class="wp-pct tnum" id="wp-pct">${p}<span>%</span></div><div id="wp-status">${statusChip(p)}</div></div>
            <span class="bar"><span id="wp-bar" style="width:${p}%"></span></span>
            <div class="wp-sub tnum" id="wp-sub"></div>
            <p class="fine">Counts as completed at ${COMPLETE_AT}% watched. This number shows on your profile and in the admin report.</p>
          </section>
          <section class="panel">
            <div class="eyebrow">Chapters</div>
            <ol class="chapters">${c.chapters.map((ch, i) => `<li><button class="chapter" data-act="chapter" data-at="${ch.at}"><span class="ch-no">${i + 1}</span><span class="ch-title">${esc(ch.t)}</span><span class="ch-time tnum">${fmtClock(ch.at)}</span></button></li>`).join('')}</ol>
          </section>
        </aside>
      </div>`;
  }

  function progressRows(u, clickable) {
    const tag = clickable ? 'button' : 'div';
    return `<div class="prog-list">${S.courses.map((c) => {
      const p = pctOf(u.id, c);
      return `<${tag} class="prog-row"${clickable ? ` data-go="watch" data-param="${c.id}"` : ''}>
        ${clickable ? thumb(c) : ''}
        <span class="prog-title"><strong>${esc(c.title)}</strong><small>${esc(c.category)} · ${fmtDur(c.duration)}${c.required ? ' · Required' : ''}</small></span>
        ${bar(p)}
        <span class="prog-val tnum">${p}%</span>
        ${clickable ? statusChip(p) : ''}
      </${tag}>`;
    }).join('')}</div>`;
  }

  function profileView(u) {
    const st = userStats(u.id);
    return `<section class="panel profile-head">
        ${avatar(u, 'xl')}
        <div class="profile-id"><h1>${esc(u.name)}</h1><span>${esc(u.email)} · ${esc(u.dept)} · ${u.role === 'admin' ? 'Administrator' : 'Employee'}</span></div>
        <span class="sso-chip">✓ Verified by Google Workspace</span>
      </section>
      <section class="profile-grid">
        <article class="metric-card ring-card">
          ${ring(st.pct, 'complete', 'lg')}
          <div><div class="eyebrow">Profile completion</div><h2 style="margin:6px 0">${st.pct}% of all course video watched</h2><p class="metric-sub">Only the parts you actually watch count. A course is marked completed at ${COMPLETE_AT}%.</p></div>
        </article>
        <article class="metric-card">
          <div class="stat-list">
            <div class="stat"><span>Courses completed</span><strong class="tnum">${st.done} / ${S.courses.length}</strong></div>
            <div class="stat"><span>In progress</span><strong class="tnum">${st.inProgress}</strong></div>
            <div class="stat"><span>Video watched</span><strong class="tnum">${fmtDur(st.watched)}</strong></div>
            <div class="stat"><span>Last active</span><strong>${fmtRel(st.last)}</strong></div>
          </div>
        </article>
      </section>
      ${datesPanel(u)}
      <section class="panel">
        <div class="panel-heading"><div><div class="eyebrow">Course by course</div><h2>Your progress</h2></div></div>
        ${progressRows(u, true)}
      </section>`;
  }

  // ---------- admin views ----------
  function activityHTML(limit) {
    const labels = { completed: 'completed', started: 'started', watched: 'watched part of', published: 'published' };
    const icons = { completed: '✓', started: '▶', watched: '▶', published: '↑' };
    const rows = S.events.filter((e) => userById(e.user) && courseById(e.course)).slice(0, limit);
    if (!rows.length) return '<p class="muted">No activity yet.</p>';
    return `<div class="activity-list">${rows.map((e) => {
      const u = userById(e.user), c = courseById(e.course);
      return `<div class="activity-row">${avatar(u)}<div class="activity-copy"><strong>${esc(u.name)}</strong><span>${labels[e.type]} <b>${esc(c.title)}</b></span></div><span class="activity-time">${fmtRel(e.at)}</span><span class="activity-icon ${e.type}">${icons[e.type]}</span></div>`;
    }).join('')}</div>`;
  }

  function overviewView(u) {
    const stats = S.users.map((p) => ({ p, s: userStats(p.id) }));
    const n = S.users.length;
    const avg = Math.round(stats.reduce((a, x) => a + x.s.pct, 0) / n);
    const active = stats.filter((x) => Date.now() - x.s.last < 7 * DAY).length;
    const secs = stats.reduce((a, x) => a + x.s.watched, 0);
    const req = S.courses.filter((c) => c.required);
    const reqDone = S.users.filter((p) => req.every((c) => pctOf(p.id, c) >= COMPLETE_AT)).length;
    const recent = [...stats].sort((a, b) => b.s.last - a.s.last).slice(0, 5);
    return `<div class="page-heading">
        <div><div class="eyebrow"><span class="live-dot"></span>${todayLabel()}</div>
        <h1>${greeting()}, ${esc(firstName(u.name))}<span class="accent-dot">.</span></h1>
        <p class="heading-copy">Here is how ${n} employees are getting on with the AI course library.</p></div>
        <button class="primary-button" data-act="upload"><span>＋</span> Upload a course</button>
      </div>
      <section class="kpi-grid">
        <article class="kpi"><span class="kpi-label">Team completion</span><span class="kpi-value tnum">${avg}<span>%</span></span><span class="kpi-sub">average profile completion</span></article>
        <article class="kpi"><span class="kpi-label">Active this week</span><span class="kpi-value tnum">${active}<span>/${n}</span></span><span class="kpi-sub">${n - active ? `${n - active} not seen in 7+ days` : 'everyone watched something'}</span></article>
        <article class="kpi"><span class="kpi-label">Video watched</span><span class="kpi-value tnum">${(secs / 3600).toFixed(1)}<span> h</span></span><span class="kpi-sub">across all courses and people</span></article>
        <article class="kpi"><span class="kpi-label">Required courses done</span><span class="kpi-value tnum">${reqDone}<span>/${n}</span></span><span class="kpi-sub ${reqDone === n ? 'status-good' : 'status-crit'}">${req.length ? (reqDone === n ? '✓ Everyone is up to date' : `● ${n - reqDone} people still to finish`) : 'No required courses set'}</span></article>
      </section>
      <section class="content-grid">
        <article class="panel">
          <div class="panel-heading"><div><div class="eyebrow">By course</div><h2>Average share watched</h2><p>Per employee, across ${n} people. Select a course to see who has watched it.</p></div><button class="text-button" data-go="manage">Manage courses <span>↗</span></button></div>
          <div class="perf-list">${[...S.courses].sort(byNewest).map((c) => {
            const cs = courseStats(c);
            return `<button class="perf-row" data-act="course" data-id="${c.id}" data-tip="${cs.done} of ${n} completed · ${cs.started} started"><span class="perf-name">${esc(c.title)}${c.required ? '<span class="tag tag-req">Required</span>' : ''}</span>${bar(cs.avg)}<span class="perf-val tnum">${cs.avg}%</span></button>`;
          }).join('')}</div>
        </article>
        <article class="panel">
          <div class="panel-heading"><div><div class="eyebrow">Live</div><h2>Recent activity</h2></div></div>
          ${activityHTML(7)}
        </article>
      </section>
      ${celebrationsPanel(u)}
      <section class="panel">
        <div class="panel-heading"><div><div class="eyebrow">Most recently active</div><h2>People</h2></div><button class="text-button" data-go="people">See everyone <span>↗</span></button></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Employee</th><th>Department</th><th>Completed</th><th>Profile completion</th><th>Last active</th></tr></thead>
          <tbody>${recent.map(({ p, s }) => `<tr class="clickable" data-act="person" data-id="${p.id}">
            <td><div class="employee">${avatar(p)}<span><strong>${esc(p.name)}</strong><small>${esc(p.email)}</small></span></div></td>
            <td>${esc(p.dept)}</td><td class="tnum">${s.done} / ${S.courses.length}</td>
            <td><div class="table-progress">${bar(s.pct)}<b class="tnum">${s.pct}%</b></div></td>
            <td>${fmtRel(s.last)}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>`;
  }

  function manageView() {
    const n = S.users.length;
    const list = [...S.courses].sort(byNewest);
    return `<div class="page-heading"><div><div class="eyebrow">Admin</div><h1>Manage courses</h1>
        <p class="heading-copy">Every course here is visible to all ${n} employees. Mark a course as required to track it on the overview.</p></div>
        <button class="primary-button" data-act="upload"><span>＋</span> Upload a course</button></div>
      <section class="panel"><div class="table-wrap"><table>
        <thead><tr><th>Course</th><th>Length</th><th>Average watched</th><th>Completed</th><th>Published</th><th>Required</th><th></th></tr></thead>
        <tbody>${list.map((c) => {
          const cs = courseStats(c);
          return `<tr>
            <td><div class="course-cell">${thumb(c)}<div><button data-act="course" data-id="${c.id}">${esc(c.title)}</button><small>${esc(c.category)}${c.file ? ` · ${esc(c.file)}` : ''}</small></div></div></td>
            <td class="tnum">${fmtClock(c.duration)}</td>
            <td><div class="table-progress">${bar(cs.avg)}<b class="tnum">${cs.avg}%</b></div></td>
            <td class="tnum">${cs.done} / ${n}</td>
            <td>${fmtDate(c.uploadedAt)}</td>
            <td><button class="switch" data-act="toggle-req" data-id="${c.id}" aria-pressed="${c.required}" aria-label="Required: ${esc(c.title)}"><span></span></button></td>
            <td><div class="row-actions"><button class="row-link" data-act="course" data-id="${c.id}">Who watched</button><button class="row-link danger" data-act="remove" data-id="${c.id}">Remove</button></div></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div></section>`;
  }

  function peopleRowsHTML() {
    const q = peopleQuery.trim().toLowerCase();
    const rows = S.users
      .filter((p) => (peopleDept === 'All' || p.dept === peopleDept) && (!q || p.name.toLowerCase().includes(q) || p.email.includes(q)))
      .map((p) => ({ p, s: userStats(p.id) }))
      .sort((a, b) => b.s.pct - a.s.pct);
    const courses = [...S.courses].sort((a, b) => a.uploadedAt - b.uploadedAt);
    if (!rows.length) return `<tr class="empty-row"><td colspan="${courses.length + 2}">No one matches that search.</td></tr>`;
    return rows.map(({ p, s }) => `<tr class="clickable" data-act="person" data-id="${p.id}">
      <td><div class="employee">${avatar(p)}<span><strong>${esc(p.name)}</strong><small>${esc(p.dept)} · ${fmtRel(s.last)}</small></span></div></td>
      <td class="overall-cell"><div class="table-progress">${bar(s.pct)}<b class="tnum">${s.pct}%</b></div></td>
      ${courses.map((c) => { const v = pctOf(p.id, c); return `<td class="hc"><span class="heat ${heatClass(v)}" data-tip="${esc(p.name)} · ${esc(c.title)}: ${v}% watched">${v ? v + '%' : '–'}</span></td>`; }).join('')}
    </tr>`).join('');
  }

  function peopleView() {
    const depts = ['All', ...new Set(S.users.map((u) => u.dept))];
    const courses = [...S.courses].sort((a, b) => a.uploadedAt - b.uploadedAt);
    const legend = [['h0', 'Not started'], ['h1', '1–24%'], ['h2', '25–49%'], ['h3', '50–74%'], ['h4', `75–${COMPLETE_AT - 1}%`], ['h5', `${COMPLETE_AT}%+ completed`]];
    return `<div class="page-heading"><div><div class="eyebrow">Admin</div><h1>People & progress</h1>
        <p class="heading-copy">How much of each course every employee has watched. Select a person for their full profile.</p></div></div>
      <section class="panel">
        <div class="toolbar">
          <div class="toolbar-left">
            <input class="search" id="people-search" type="search" placeholder="Search by name or email" value="${esc(peopleQuery)}" aria-label="Search people" />
            <select class="select" id="people-dept" aria-label="Department">${depts.map((d) => `<option ${d === peopleDept ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
          </div>
          <div class="heat-legend" aria-label="Colour key">${legend.map(([k, l]) => `<span><i class="${k}"></i>${l}</span>`).join('')}</div>
        </div>
        <div class="table-wrap"><table class="heat-table">
          <thead><tr><th>Employee</th><th>Profile completion</th>${courses.map((c) => `<th class="hc" title="${esc(c.title)}"><span>${esc(c.short)}</span></th>`).join('')}</tr></thead>
          <tbody id="people-body">${peopleRowsHTML()}</tbody>
        </table></div>
      </section>`;
  }

  function personDrawer(id) {
    const p = userById(id);
    if (!p) return '';
    const st = userStats(id);
    const req = S.courses.filter((c) => c.required);
    const reqLeft = req.filter((c) => pctOf(id, c) < COMPLETE_AT);
    return `<div class="modal-head"><div class="acct-card">${avatar(p, 'lg')}<div><strong>${esc(p.name)}</strong><small>${esc(p.email)} · ${esc(p.dept)}</small></div></div><button class="x" data-act="close" aria-label="Close">×</button></div>
      <div class="drawer-stats">${ring(st.pct, 'complete', 'sm')}
        <div class="stat-list">
          <div class="stat"><span>Completed</span><strong class="tnum">${st.done} / ${S.courses.length}</strong></div>
          <div class="stat"><span>Video watched</span><strong class="tnum">${fmtDur(st.watched)}</strong></div>
          <div class="stat"><span>Last active</span><strong>${fmtRel(st.last)}</strong></div>
          <div class="stat"><span>Required</span><strong class="${reqLeft.length ? 'status-crit' : 'status-good'}" style="font-size:15px">${req.length ? (reqLeft.length ? `● ${reqLeft.length} not done` : '✓ All done') : 'None set'}</strong></div>
        </div>
      </div>
      <h3>Course by course</h3>
      ${progressRows(p, false)}`;
  }

  function courseDrawer(id) {
    const c = courseById(id);
    if (!c) return '';
    const cs = courseStats(c);
    const rows = S.users.map((u) => ({ u, p: pctOf(u.id, c) })).sort((a, b) => b.p - a.p);
    const started = rows.filter((r) => r.p > 0);
    const notStarted = rows.filter((r) => r.p === 0);
    return `<div class="modal-head"><div><div class="eyebrow">${esc(c.category)} · ${fmtDur(c.duration)}${c.required ? ' · Required' : ''}</div><h2>${esc(c.title)}</h2></div><button class="x" data-act="close" aria-label="Close">×</button></div>
      <div class="drawer-stats">${ring(cs.avg, 'avg watched', 'sm')}
        <div class="stat-list">
          <div class="stat"><span>Completed</span><strong class="tnum">${cs.done} / ${S.users.length}</strong></div>
          <div class="stat"><span>Started</span><strong class="tnum">${cs.started} / ${S.users.length}</strong></div>
        </div>
      </div>
      <h3>Share watched, per person</h3>
      <div class="people-bars">${started.length ? started.map(({ u, p }) => `<div class="people-bar"><div class="employee">${avatar(u)}<span><strong>${esc(u.name)}</strong><small>${esc(u.dept)}</small></span></div>${bar(p)}<span class="prog-val tnum">${p}%</span></div>`).join('') : '<p class="muted">Nobody has started this course yet.</p>'}</div>
      ${notStarted.length ? `<div><h3>Not started (${notStarted.length})</h3><p class="not-started" style="margin-top:6px">${notStarted.map(({ u }) => esc(u.name)).join(', ')}</p></div>` : ''}`;
  }

  function uploadModal() {
    const cats = [...new Set([...CATEGORIES, ...S.courses.map((c) => c.category)])];
    return `<div class="modal-head"><div><div class="eyebrow">Admin</div><h2>Upload a course</h2></div><button class="x" data-act="close" aria-label="Close">×</button></div>
      <form id="upload-form" novalidate style="display:flex;flex-direction:column;gap:16px">
        <label class="drop" id="drop" for="up-file"><span class="drop-icon">↑</span><strong>Drop a video here or click to choose</strong><span>MP4, WebM or MOV. The length is read from the file.</span><input id="up-file" type="file" accept="video/*" /></label>
        <div class="file-info" id="up-info" hidden></div>
        <div class="field"><label for="up-yt">Or paste a YouTube link</label><input id="up-yt" type="url" placeholder="https://youtu.be/…" /></div>
        <div class="form-grid">
          <div class="field full"><label for="up-title">Course title</label><input id="up-title" type="text" placeholder="e.g. AI for faster month-end close" /></div>
          <div class="field"><label for="up-cat">Category</label><select id="up-cat">${cats.map((c) => `<option>${esc(c)}</option>`).join('')}</select></div>
          <div class="field"><label for="up-mins">Length (minutes)</label><input id="up-mins" type="number" min="1" step="0.5" placeholder="10" /></div>
          <div class="field full"><label for="up-desc">Short description</label><textarea id="up-desc" placeholder="What will people be able to do after watching?"></textarea></div>
          <label class="check full" for="up-req"><input id="up-req" type="checkbox" /> Required for all employees</label>
        </div>
        <p class="reach-note">Publishing makes this course visible to all ${S.users.length} employees straight away. Their progress shows up in People & progress.</p>
        <p class="field-error" id="up-error" hidden></p>
        <div class="modal-actions"><button type="button" class="ghost-button" data-act="close">Cancel</button><button type="submit" class="primary-button">Publish course</button></div>
      </form>`;
  }

  function handleFile(f) {
    const info = $('#up-info');
    if (!f) return;
    if (!f.type.startsWith('video/')) { info.hidden = false; info.textContent = `${f.name} isn't a video file. Choose an MP4, WebM or MOV.`; return; }
    if (pendingUpload) URL.revokeObjectURL(pendingUpload.url);
    const url = URL.createObjectURL(f);
    pendingUpload = { url, name: f.name, duration: 0 };
    const title = $('#up-title');
    if (!title.value) title.value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    info.hidden = false;
    info.textContent = `${f.name} · ${(f.size / 1e6).toFixed(1)} MB · reading length…`;
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      if (!pendingUpload || pendingUpload.url !== url || !isFinite(v.duration)) return;
      pendingUpload.duration = v.duration;
      const mins = $('#up-mins');
      mins.value = (v.duration / 60).toFixed(1);
      mins.readOnly = true;
      info.textContent = `✓ ${f.name} · ${fmtClock(v.duration)} · ${(f.size / 1e6).toFixed(1)} MB`;
    };
    v.onerror = () => { info.textContent = `${f.name} · couldn't read the length. Enter it below.`; };
    v.src = url;
  }

  function publishUpload() {
    const u = me();
    const err = $('#up-error');
    const title = $('#up-title').value.trim();
    const mins = parseFloat($('#up-mins').value);
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    const ytUrl = $('#up-yt').value.trim();
    const youtube = !pendingUpload && ytUrl ? parseYouTube(ytUrl) : null;
    if (!pendingUpload && ytUrl && !youtube) return fail('That doesn’t look like a YouTube video link. Paste a link like https://youtu.be/kuGjypoJKwk.');
    if (!title) return fail('Add a course title.');
    // For YouTube links the exact length is read when the video first loads.
    let secs = pendingUpload && pendingUpload.duration ? Math.round(pendingUpload.duration) : Math.round(mins * 60);
    if (!secs && youtube) secs = 60;
    if (!secs || secs < 10) return fail('Add the video length in minutes, or choose a video file.');
    const desc = $('#up-desc').value.trim() || `A new course from ${u.name}.`;
    const sentences = desc.split(/(?<=[.!?])\s+/).filter(Boolean);
    const parts = ['Introduction', 'Key ideas', 'In practice', 'Recap'];
    const course = {
      id: 'u' + Date.now().toString(36),
      short: title.length > 18 ? title.slice(0, 16).trim() + '…' : title,
      title, category: $('#up-cat').value, duration: secs, theme: S.courses.length % THEMES.length,
      required: $('#up-req').checked, desc, uploadedAt: Date.now(), uploadedBy: u.id,
      file: pendingUpload ? pendingUpload.name : null,
      youtube, videoLabel: youtube ? 'YouTube' : null,
      chapters: parts.map((t, i) => ({ t, at: Math.round((i * secs) / parts.length), points: i === 0 ? sentences.slice(0, 3) : [title] })),
    };
    S.courses.push(course);
    if (pendingUpload) { FILES.set(course.id, pendingUpload.url); pendingUpload = null; }
    logEvent(u.id, course.id, 'published');
    save();
    closeModal();
    toast(`Published “${title}” to all ${S.users.length} employees`);
    go('manage');
  }

  const VIEWS = { home: homeView, library: libraryView, watch: watchView, profile: profileView, overview: overviewView, manage: manageView, people: peopleView };

  // ---------- modal ----------
  function openModal(html, kind = 'modal') {
    $('#modal-root').innerHTML = `<div class="backdrop" data-act="close"></div><div class="${kind}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.classList.add('locked');
    hideTip();
    const first = $('#modal-root [role="dialog"] input, #modal-root [role="dialog"] button:not(.x)');
    if (first) first.focus({ preventScroll: true });
  }

  function closeModal() {
    if (pendingUpload) { URL.revokeObjectURL(pendingUpload.url); pendingUpload = null; }
    $('#modal-root').innerHTML = '';
    document.body.classList.remove('locked');
  }

  // ---------- player ----------
  function startPlayer(u, cid) {
    const c = courseById(cid);
    const prog = S.progress[u.id] && S.progress[u.id][c.id];
    P = { u, c, t: prog && prog.pos < c.duration - 1 ? prog.pos : 0, playing: false, speed: 1, lastTs: 0, lastUi: 0, lastSave: Date.now(), prevT: null, dirty: false, touched: false, rangesKey: '' };
    const vid = $('#vid');
    if (vid) {
      P.mode = 'video';
      P.video = vid;
      vid.addEventListener('loadedmetadata', () => {
        if (isFinite(vid.duration) && Math.abs(vid.duration - c.duration) > 1) { c.duration = Math.round(vid.duration); save(); }
        vid.currentTime = P ? P.t : 0;
      });
      vid.addEventListener('ended', () => { if (P) { P.playing = false; onEnded(); } });
      vid.addEventListener('click', togglePlay);
      vid.addEventListener('error', () => {
        FILES.delete(c.id);
        toast('This browser could not play the file, so a placeholder lesson is shown.');
        renderApp();
      });
    } else if ($('#yt')) {
      P.mode = 'yt';
      P.ready = false;
      const player = P;
      loadYouTubeApi().then(() => {
        if (P !== player) return;
        P.yt = new window.YT.Player('yt', {
          videoId: c.youtube,
          playerVars: { controls: 0, disablekb: 1, rel: 0, playsinline: 1, modestbranding: 1, iv_load_policy: 3, start: Math.floor(P.t) },
          events: {
            onReady: (e) => {
              if (P !== player) return;
              setDuration(c, Math.round(e.target.getDuration()));
              P.ready = true;
              updateUI();
            },
            onStateChange: (e) => {
              if (P !== player) return;
              const st = e.data;
              if (st === 1) { P.playing = true; P.prevT = P.yt.getCurrentTime(); }
              else if (st === 2) { P.playing = false; persist(true); }
              else if (st === 0) { P.playing = false; P.t = c.duration; onEnded(); }
              updateUI();
            },
            onError: () => { if (P === player) youtubeFailed(); },
          },
        });
      }).catch(youtubeFailed);
    } else {
      P.mode = 'sim';
      P.canvas = $('#stage');
      P.ctx = P.canvas.getContext('2d');
      P.canvas.addEventListener('click', togglePlay);
      sizeCanvas();
    }
    $('#speed').addEventListener('change', (e) => {
      P.speed = +e.target.value;
      if (P.video) P.video.playbackRate = Math.min(P.speed, 16);
      if (P.yt && P.ready) P.yt.setPlaybackRate(P.speed);
    });
    bindScrub();
    updateUI();
    P.raf = requestAnimationFrame(tick);
  }

  function stopPlayer() {
    if (!P) return;
    cancelAnimationFrame(P.raf);
    if (P.video) P.video.pause();
    if (P.yt) { try { P.yt.destroy(); } catch (e) { /* already gone */ } }
    if (P.touched && !P.completedNow) logEvent(P.u.id, P.c.id, 'watched');
    save();
    P = null;
  }

  function togglePlay() {
    if (!P) return;
    if (P.mode === 'yt') {
      // YouTube reports play/pause back through onStateChange.
      if (!P.ready) return;
      if (P.yt.getPlayerState() === 1) P.yt.pauseVideo();
      else {
        if (P.t >= P.c.duration - 0.5) seek(0);
        P.yt.setPlaybackRate(P.speed);
        P.yt.playVideo();
      }
      return;
    }
    if (!P.playing && P.t >= P.c.duration - 0.05) seek(0);
    P.playing = !P.playing;
    P.lastTs = 0;
    P.prevT = P.t;
    if (P.video) {
      if (P.playing) P.video.play().catch(() => { if (P) { P.playing = false; updateUI(); } });
      else P.video.pause();
    }
    if (!P.playing) persist(true);
    updateUI();
  }

  function seek(t) {
    if (!P) return;
    P.t = Math.max(0, Math.min(P.c.duration, t));
    P.prevT = P.t;
    P.lastTs = 0;
    if (P.video) P.video.currentTime = P.t;
    if (P.yt && P.ready) P.yt.seekTo(P.t, true);
    updateUI();
  }

  function record(a, b) {
    if (b - a <= 0) return;
    const { u, c } = P;
    S.progress[u.id] = S.progress[u.id] || {};
    let pr = S.progress[u.id][c.id];
    if (!pr) {
      pr = S.progress[u.id][c.id] = { ranges: [], pos: 0, last: Date.now(), done: false };
      logEvent(u.id, c.id, 'started');
    }
    addRange(pr.ranges, a, b);
    pr.pos = b;
    pr.last = Date.now();
    P.dirty = true;
    P.touched = true;
    if (!pr.done && pctOf(u.id, c) >= COMPLETE_AT) {
      pr.done = true;
      P.completedNow = true;
      logEvent(u.id, c.id, 'completed');
      toast(`✓ Completed: ${c.title}`);
      persist(true);
    }
  }

  function persist(force) {
    if (!P) return;
    P.lastSave = Date.now();
    if (P.dirty || force) { save(); P.dirty = false; }
  }

  function onEnded() {
    persist(true);
    updateUI();
    if (pctOf(P.u.id, P.c) < COMPLETE_AT) toast('You reached the end. Watch the parts you skipped to complete this course.');
  }

  function tick(ts) {
    if (!P) return;
    if (P.mode === 'sim') {
      if (P.playing) {
        const dt = P.lastTs ? Math.min(0.25, (ts - P.lastTs) / 1000) * P.speed : 0;
        const from = P.t;
        P.t = Math.min(P.c.duration, P.t + dt);
        record(from, P.t);
        if (P.t >= P.c.duration) { P.playing = false; onEnded(); }
      }
      P.lastTs = ts;
      drawStage(ts);
    } else if (P.mode === 'yt') {
      // Before the first play the video is only cued and reports time 0; keep the resume point.
      const st = P.ready && P.yt.getPlayerState ? P.yt.getPlayerState() : -1;
      if (st === 1 || st === 2 || st === 3) {
        const now = P.yt.getCurrentTime() || 0;
        if (st === 1 && P.prevT != null) {
          const d = now - P.prevT;
          if (d > 0 && d < 1.5 * (P.yt.getPlaybackRate() || 1) + 0.5) record(P.prevT, now);
        }
        P.prevT = now;
        P.t = now;
      }
    } else {
      const v = P.video;
      const now = v.currentTime || 0;
      if (P.playing && !v.paused && !v.seeking && P.prevT != null) {
        const d = now - P.prevT;
        if (d > 0 && d < 1.5 * v.playbackRate + 0.5) record(P.prevT, now);
      }
      P.prevT = now;
      P.t = now;
    }
    if (!P) return;
    if (ts - P.lastUi > 120) { updateUI(); P.lastUi = ts; }
    if (Date.now() - P.lastSave > 1500) persist();
    P.raf = requestAnimationFrame(tick);
  }

  function updateUI() {
    if (!P) return;
    const { c, u } = P;
    const pr = S.progress[u.id] && S.progress[u.id][c.id];
    const p = pctOf(u.id, c);
    $('#clock').textContent = `${fmtClock(P.t)} / ${fmtClock(c.duration)}`;
    $('#scrub-head').style.left = `${(P.t / c.duration) * 100}%`;
    const scrub = $('#scrub');
    scrub.setAttribute('aria-valuenow', Math.round(P.t));
    scrub.setAttribute('aria-valuetext', `${fmtClock(P.t)} of ${fmtClock(c.duration)}`);
    const ranges = pr ? pr.ranges : [];
    const key = JSON.stringify(ranges);
    if (key !== P.rangesKey) {
      P.rangesKey = key;
      $('#scrub-watched').innerHTML = ranges.map(([a, b]) => `<span style="left:${(a / c.duration) * 100}%;width:${((b - a) / c.duration) * 100}%"></span>`).join('');
      $('#wp-pct').innerHTML = `${p}<span>%</span>`;
      $('#wp-bar').style.width = `${p}%`;
      $('#wp-status').innerHTML = statusChip(p);
      $('#wp-sub').textContent = `${fmtClock(Math.min(c.duration, watchedSecs(ranges)))} of ${fmtClock(c.duration)} watched`;
    }
    const label = P.playing ? 'Pause' : 'Play';
    const btn = $('#ctrl-play');
    btn.textContent = P.playing ? '❚❚' : '▶';
    btn.setAttribute('aria-label', label);
    $('#big-play').hidden = P.playing;
    let ci = 0;
    c.chapters.forEach((ch, i) => { if (P.t >= ch.at) ci = i; });
    document.querySelectorAll('.chapter').forEach((el, i) => el.classList.toggle('active', i === ci));
  }

  function bindScrub() {
    const scrub = $('#scrub');
    const fromEvent = (e) => {
      const r = scrub.getBoundingClientRect();
      seek(((e.clientX - r.left) / r.width) * P.c.duration);
    };
    let dragging = false;
    scrub.addEventListener('pointerdown', (e) => { dragging = true; scrub.setPointerCapture(e.pointerId); fromEvent(e); });
    scrub.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
    scrub.addEventListener('pointerup', () => { dragging = false; });
    scrub.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { seek(P.t + 10); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { seek(P.t - 10); e.preventDefault(); }
    });
  }

  function sizeCanvas() {
    if (!P || !P.canvas) return;
    const w = P.canvas.getBoundingClientRect().width || 640;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    P.canvas.width = Math.round(w * dpr);
    P.canvas.height = Math.round((w * dpr * 9) / 16);
  }

  function wrap(ctx, text, max) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    words.forEach((w) => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > max && line) { lines.push(line); line = w; } else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  // Placeholder "AI presenter" lesson, drawn from the course's chapter outline.
  function drawStage(ts) {
    const { ctx, canvas, c } = P;
    const W = canvas.width, H = canvas.height, k = W / 960;
    const th = THEMES[c.theme % THEMES.length];
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, th.a);
    g.addColorStop(1, '#101c21');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (let x = 24 * k; x < W; x += 32 * k) for (let y = 24 * k; y < H - 64 * k; y += 32 * k) ctx.fillRect(x, y, 2 * k, 2 * k);

    let ci = 0;
    c.chapters.forEach((ch, i) => { if (P.t >= ch.at) ci = i; });
    const ch = c.chapters[ci];
    const end = ci + 1 < c.chapters.length ? c.chapters[ci + 1].at : c.duration;
    const frac = (P.t - ch.at) / Math.max(1, end - ch.at);
    const L = 64 * k;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = th.c;
    ctx.font = `600 ${14 * k}px "DM Sans", sans-serif`;
    ctx.fillText(`CHAPTER ${ci + 1} OF ${c.chapters.length}`, L, 96 * k);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${40 * k}px "Space Grotesk", sans-serif`;
    const lines = wrap(ctx, ch.t, 470 * k);
    lines.forEach((ln, i) => ctx.fillText(ln, L, 148 * k + i * 46 * k));
    let y = 148 * k + lines.length * 46 * k + 26 * k;
    const shown = Math.min(ch.points.length, 1 + Math.floor(frac * ch.points.length));
    ctx.font = `500 ${19 * k}px "DM Sans", sans-serif`;
    ch.points.slice(0, shown).forEach((pt) => {
      const pl = wrap(ctx, pt, 430 * k);
      ctx.fillStyle = th.c;
      ctx.beginPath();
      ctx.arc(L + 5 * k, y - 6 * k, 4 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.88)';
      pl.forEach((l, i) => ctx.fillText(l, L + 22 * k, y + i * 26 * k));
      y += pl.length * 26 * k + 14 * k;
    });

    const cx = W * 0.77, cy = H * 0.44, R = 84 * k, time = ts / 1000, amp = P.playing ? 1 : 0;
    for (let i = 3; i >= 1; i--) {
      ctx.strokeStyle = `rgba(255,255,255,${0.05 * i})`;
      ctx.lineWidth = 1.5 * k;
      ctx.beginPath();
      ctx.arc(cx, cy, R + i * 22 * k + amp * Math.sin(time * 2 + i) * 5 * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    const og = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    og.addColorStop(0, th.c);
    og.addColorStop(1, th.b);
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    const bars = 9, bw = 7 * k, gap = 5 * k, x0 = cx - (bars * bw + (bars - 1) * gap) / 2;
    ctx.fillStyle = th.a;
    for (let i = 0; i < bars; i++) {
      const h = (8 + amp * (20 + 18 * Math.sin(time * 6 + i * 1.3) * Math.sin(time * 2.3 + i))) * k;
      ctx.fillRect(x0 + i * (bw + gap), cy - h / 2, bw, h);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = `600 ${13 * k}px "DM Sans", sans-serif`;
    ctx.fillText(P.playing ? 'AI presenter · speaking' : 'AI presenter', cx, cy + R + 84 * k);

    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.fillRect(0, H - 64 * k, W, 64 * k);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${16 * k}px "Space Grotesk", sans-serif`;
    ctx.fillText(c.title, L, H - 26 * k);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = `500 ${13 * k}px "DM Sans", sans-serif`;
    ctx.fillText('scube · AI course', W - L, H - 26 * k);
    ctx.textAlign = 'left';
  }

  // ---------- actions ----------
  const ACTIONS = {
    google: () => openModal(chooserModal()),
    pick: (el) => login(el.dataset.id),
    account: () => openModal(accountModal()),
    signout: () => {
      stopPlayer();
      S.session = null;
      save();
      closeModal();
      view = null;
      renderApp();
      toast('Signed out');
    },
    reset: () => openModal(`<div class="modal-head"><div><div class="eyebrow">Demo</div><h2>Reset demo data?</h2></div><button class="x" data-act="close" aria-label="Close">×</button></div>
      <p class="muted">This restores the sample courses, people and progress. Courses you uploaded and progress you recorded are removed.</p>
      <div class="modal-actions"><button class="ghost-button" data-act="close">Cancel</button><button class="danger-button" data-act="do-reset">Reset demo data</button></div>`),
    'do-reset': () => {
      const session = S.session;
      stopPlayer();
      FILES.forEach((url) => URL.revokeObjectURL(url));
      FILES.clear();
      S = seedState();
      S.session = userById(session) ? session : null;
      save();
      closeModal();
      view = null;
      renderApp();
      toast('Demo data reset');
    },
    close: () => closeModal(),
    play: () => togglePlay(),
    chapter: (el) => { seek(+el.dataset.at); if (P && !P.playing) togglePlay(); },
    cat: (el) => { libFilter = el.dataset.cat; renderApp(); },
    upload: () => openModal(uploadModal(), 'modal wide'),
    'test-mail': () => openModal(testMailModal()),
    'toggle-req': (el) => {
      const c = courseById(el.dataset.id);
      c.required = !c.required;
      save();
      renderApp();
      toast(c.required ? `“${c.title}” is now required for everyone` : `“${c.title}” is now optional`);
    },
    remove: (el) => {
      const c = courseById(el.dataset.id);
      if (!el.classList.contains('armed')) {
        el.classList.add('armed');
        el.textContent = 'Confirm remove';
        setTimeout(() => { if (el.isConnected) { el.classList.remove('armed'); el.textContent = 'Remove'; } }, 3500);
        return;
      }
      S.courses = S.courses.filter((x) => x.id !== c.id);
      Object.values(S.progress).forEach((p) => delete p[c.id]);
      S.events = S.events.filter((e) => e.course !== c.id);
      if (FILES.has(c.id)) { URL.revokeObjectURL(FILES.get(c.id)); FILES.delete(c.id); }
      save();
      renderApp();
      toast(`Removed “${c.title}”`);
    },
    person: (el) => openModal(personDrawer(el.dataset.id), 'drawer'),
    course: (el) => openModal(courseDrawer(el.dataset.id), 'drawer'),
  };

  document.addEventListener('click', (e) => {
    const goEl = e.target.closest('[data-go]');
    if (goEl) {
      e.preventDefault();
      if ($('#modal-root').innerHTML) closeModal();
      go(goEl.dataset.go, goEl.dataset.param);
      return;
    }
    const el = e.target.closest('[data-act]');
    if (el && ACTIONS[el.dataset.act]) ACTIONS[el.dataset.act](el, e);
  });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.id === 'other-form') signInOther($('#other-email').value);
    if (e.target.id === 'upload-form') publishUpload();
    if (e.target.id === 'dates-form') saveDates();
    if (e.target.id === 'test-form') sendTestMail();
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'up-file') handleFile(e.target.files[0]);
    if (e.target.id === 'people-dept') { peopleDept = e.target.value; $('#people-body').innerHTML = peopleRowsHTML(); }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'people-search') { peopleQuery = e.target.value; $('#people-body').innerHTML = peopleRowsHTML(); }
  });

  ['dragenter', 'dragover'].forEach((t) => document.addEventListener(t, (e) => { const d = e.target.closest && e.target.closest('#drop'); if (d) d.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => document.addEventListener(t, (e) => { const d = e.target.closest && e.target.closest('#drop'); if (d) d.classList.remove('over'); }));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#modal-root').innerHTML) { closeModal(); return; }
    const tag = e.target.tagName;
    if (e.key === ' ' && P && !$('#modal-root').innerHTML && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag) && e.target.id !== 'scrub') {
      e.preventDefault();
      togglePlay();
    }
  });

  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el) showTip(el); else hideTip();
  });
  document.addEventListener('focusin', (e) => { const el = e.target.closest('[data-tip]'); if (el) showTip(el); });
  document.addEventListener('focusout', hideTip);
  window.addEventListener('scroll', hideTip, { passive: true });
  window.addEventListener('resize', () => { if (P && P.canvas) sizeCanvas(); });
  window.addEventListener('pagehide', () => { if (P) persist(true); });

  if (S.session && !userById(S.session)) S.session = null;
  renderApp();
  loadCelebrations();
})();
