import { useState } from 'react';
import { Avatar, ProgressRows, Ring } from '../components/ui.jsx';
import { MONTHS, isoDate, startOfToday } from '../lib/celebrations.js';
import { COMPLETE_AT, fmtDur, fmtRel } from '../lib/format.js';
import { userStats } from '../lib/progress.js';
import { usePortal } from '../portal.jsx';

export function Profile() {
  const { data, me } = usePortal();
  const st = userStats(data.progress, data.courses, me.id);
  return (
    <>
      <section className="panel profile-head">
        <Avatar user={me} size="xl" />
        <div className="profile-id"><h1>{me.name}</h1><span>{me.email}{me.dept ? ` · ${me.dept}` : ''} · {me.role === 'admin' ? 'Administrator' : 'Employee'}</span></div>
        <span className="sso-chip">✓ Verified by Google Workspace</span>
      </section>
      <section className="profile-grid">
        <article className="metric-card ring-card">
          <Ring pct={st.pct} label="complete" size="lg" />
          <div>
            <div className="eyebrow">Profile completion</div>
            <h2 style={{ margin: '6px 0' }}>{st.pct}% of all course video watched</h2>
            <p className="metric-sub">Only the parts you actually watch count. A course is marked completed at {COMPLETE_AT}%.</p>
          </div>
        </article>
        <article className="metric-card">
          <div className="stat-list">
            <div className="stat"><span>Courses completed</span><strong className="tnum">{st.done} / {data.courses.length}</strong></div>
            <div className="stat"><span>In progress</span><strong className="tnum">{st.inProgress}</strong></div>
            <div className="stat"><span>Video watched</span><strong className="tnum">{fmtDur(st.watched)}</strong></div>
            <div className="stat"><span>Last active</span><strong>{fmtRel(st.last)}</strong></div>
          </div>
        </article>
      </section>
      <AboutYou />
      <section className="panel">
        <div className="panel-heading"><div><div className="eyebrow">Course by course</div><h2>Your progress</h2></div></div>
        <ProgressRows user={me} clickable />
      </section>
    </>
  );
}

// Name, department, birthday and joining date. The dates drive the company-wide celebration emails.
function AboutYou() {
  const { data, saveProfile, toast } = usePortal();
  const p = data.profile;
  const [form, setForm] = useState({
    name: p.name, dept: p.dept,
    day: p.birthday ? String(p.birthday.d) : '', month: p.birthday ? String(p.birthday.m) : '',
    joined: p.joined || '', optOut: p.optOut,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const today = isoDate(startOfToday());

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const d = Number(form.day), m = Number(form.month);
    if (!form.name.trim()) return setError('Add your name.');
    if (!d !== !m) return setError('Pick both the day and the month of your birthday, or leave both empty.');
    if (d && new Date(2000, m - 1, d).getMonth() !== m - 1) return setError(`${MONTHS[m - 1]} doesn’t have ${d} days.`);
    if (form.joined && (form.joined > today || form.joined < '1950-01-01')) return setError('Enter a joining date that isn’t in the future.');
    setBusy(true);
    try {
      await saveProfile({
        name: form.name.trim(), dept: form.dept.trim(), birthday: d ? { m, d } : null, joined: form.joined || null, optOut: form.optOut,
      });
      toast(form.optOut ? 'Saved. You won’t be celebrated.' : 'Your details are saved');
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">About you</div><h2>Your details, birthday & work anniversary</h2>
          <p>On your birthday and work anniversary everyone at Scube gets an email wishing you well, and you show up in Upcoming celebrations. Only the day and month of your birthday are shared, never the year.</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="pf-name">Name</label><input id="pf-name" value={form.name} onChange={set('name')} maxLength={80} /></div>
        <div className="field"><label htmlFor="pf-dept">Department</label><input id="pf-dept" value={form.dept} onChange={set('dept')} maxLength={80} placeholder="e.g. Design" /></div>
        <div className="field">
          <label htmlFor="bd-day">Birthday</label>
          <div className="inline-field">
            <select id="bd-day" aria-label="Birthday day" value={form.day} onChange={set('day')}>
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
            <select id="bd-month" aria-label="Birthday month" value={form.month} onChange={set('month')}>
              <option value="">Month</option>
              {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label htmlFor="pf-joined">Joining date at Scube</label><input id="pf-joined" type="date" min="1950-01-01" max={today} value={form.joined} onChange={set('joined')} /></div>
        <label className="check full" htmlFor="pf-opt"><input id="pf-opt" type="checkbox" checked={form.optOut} onChange={set('optOut')} /> Don’t celebrate me (no company email, not shown on the dashboard)</label>
        {error && <p className="field-error full">{error}</p>}
        <div className="modal-actions full"><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button></div>
      </form>
    </section>
  );
}
