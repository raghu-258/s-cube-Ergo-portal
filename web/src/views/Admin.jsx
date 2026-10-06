import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CelebrationsPanel } from '../components/Celebrations.jsx';
import { ActivityList, Avatar, Bar, ModalHeader, ProgressRows, Ring, Thumb } from '../components/ui.jsx';
import { UploadModal } from '../components/UploadModal.jsx';
import { COMPLETE_AT, DAY, byNewest, firstName, fmtClock, fmtDate, fmtDur, fmtRel, greeting, heatClass, todayLabel } from '../lib/format.js';
import { courseStats, pctOf, userStats } from '../lib/progress.js';
import { usePortal } from '../portal.jsx';

export function Overview() {
  const { data, me, openModal } = usePortal();
  const navigate = useNavigate();
  const { users, courses, progress } = data;
  const n = users.length;
  const stats = users.map((p) => ({ p, s: userStats(progress, courses, p.id) }));
  const avg = n ? Math.round(stats.reduce((a, x) => a + x.s.pct, 0) / n) : 0;
  const active = stats.filter((x) => Date.now() - x.s.last < 7 * DAY).length;
  const secs = stats.reduce((a, x) => a + x.s.watched, 0);
  const req = courses.filter((c) => c.required);
  const reqDone = users.filter((p) => req.every((c) => pctOf(progress, p.id, c) >= COMPLETE_AT)).length;
  const recent = [...stats].sort((a, b) => b.s.last - a.s.last).slice(0, 5);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="live-dot" />{todayLabel()}</div>
          <h1>{greeting()}, {firstName(me.name)}<span className="accent-dot">.</span></h1>
          <p className="heading-copy">Here is how {n} {n === 1 ? 'employee is' : 'employees are'} getting on with the AI course library. Updates every minute.</p>
        </div>
        <button className="primary-button" onClick={() => openModal(<UploadModal />, 'modal wide')}><span>＋</span> Upload a course</button>
      </div>
      <section className="kpi-grid">
        <article className="kpi"><span className="kpi-label">Team completion</span><span className="kpi-value tnum">{avg}<span>%</span></span><span className="kpi-sub">average profile completion</span></article>
        <article className="kpi"><span className="kpi-label">Active this week</span><span className="kpi-value tnum">{active}<span>/{n}</span></span><span className="kpi-sub">{n - active ? `${n - active} not seen in 7+ days` : 'everyone watched something'}</span></article>
        <article className="kpi"><span className="kpi-label">Video watched</span><span className="kpi-value tnum">{(secs / 3600).toFixed(1)}<span> h</span></span><span className="kpi-sub">across all courses and people</span></article>
        <article className="kpi">
          <span className="kpi-label">Required courses done</span><span className="kpi-value tnum">{reqDone}<span>/{n}</span></span>
          <span className={`kpi-sub ${reqDone === n ? 'status-good' : 'status-crit'}`}>{req.length ? (reqDone === n ? '✓ Everyone is up to date' : `● ${n - reqDone} people still to finish`) : 'No required courses set'}</span>
        </article>
      </section>
      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div><div className="eyebrow">By course</div><h2>Average share watched</h2><p>Per employee, across {n} people. Select a course to see who has watched it.</p></div>
            <button className="text-button" onClick={() => navigate('/admin/courses')}>Manage courses <span>↗</span></button>
          </div>
          <div className="perf-list">
            {[...courses].sort(byNewest).map((c) => {
              const cs = courseStats(progress, users, c);
              return (
                <button key={c.id} className="perf-row" onClick={() => openModal(<CourseDrawer id={c.id} />, 'drawer')} data-tip={`${cs.done} of ${n} completed · ${cs.started} started`}>
                  <span className="perf-name">{c.title}{c.required && <span className="tag tag-req">Required</span>}</span>
                  <Bar pct={cs.avg} /><span className="perf-val tnum">{cs.avg}%</span>
                </button>
              );
            })}
            {!courses.length && <p className="muted">No courses yet. Upload the first one.</p>}
          </div>
        </article>
        <article className="panel">
          <div className="panel-heading"><div><div className="eyebrow">Live</div><h2>Recent activity</h2></div></div>
          <ActivityList limit={7} />
        </article>
      </section>
      <CelebrationsPanel />
      <section className="panel">
        <div className="panel-heading">
          <div><div className="eyebrow">Most recently active</div><h2>People</h2></div>
          <button className="text-button" onClick={() => navigate('/admin/people')}>See everyone <span>↗</span></button>
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>Employee</th><th>Department</th><th>Completed</th><th>Profile completion</th><th>Last active</th></tr></thead>
          <tbody>
            {recent.map(({ p, s }) => (
              <tr key={p.id} className="clickable" onClick={() => openModal(<PersonDrawer id={p.id} />, 'drawer')}>
                <td><div className="employee"><Avatar user={p} /><span><strong>{p.name}</strong><small>{p.email}</small></span></div></td>
                <td>{p.dept || '–'}</td><td className="tnum">{s.done} / {courses.length}</td>
                <td><div className="table-progress"><Bar pct={s.pct} /><b className="tnum">{s.pct}%</b></div></td>
                <td>{fmtRel(s.last)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </>
  );
}

export function Manage() {
  const { data, openModal, setRequired, removeCourse, toast } = usePortal();
  const [armed, setArmed] = useState(null);
  const n = data.users.length;

  const toggleRequired = (c) => setRequired(c.id, !c.required).then(
    () => toast(!c.required ? `“${c.title}” is now required for everyone` : `“${c.title}” is now optional`),
    (e) => toast(e.message),
  );
  const remove = (c) => {
    if (armed !== c.id) {
      setArmed(c.id);
      setTimeout(() => setArmed((a) => (a === c.id ? null : a)), 3500);
      return;
    }
    removeCourse(c.id).then(() => toast(`Removed “${c.title}”`), (e) => toast(e.message));
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Admin</div><h1>Manage courses</h1>
          <p className="heading-copy">Every course here is visible to all {n} employees. Mark a course as required to track it on the overview.</p>
        </div>
        <button className="primary-button" onClick={() => openModal(<UploadModal />, 'modal wide')}><span>＋</span> Upload a course</button>
      </div>
      <section className="panel"><div className="table-wrap"><table>
        <thead><tr><th>Course</th><th>Length</th><th>Average watched</th><th>Completed</th><th>Published</th><th>Required</th><th /></tr></thead>
        <tbody>
          {[...data.courses].sort(byNewest).map((c) => {
            const cs = courseStats(data.progress, data.users, c);
            return (
              <tr key={c.id}>
                <td><div className="course-cell"><Thumb course={c} /><div>
                  <button onClick={() => openModal(<CourseDrawer id={c.id} />, 'drawer')}>{c.title}</button>
                  <small>{c.category}{c.file ? ` · ${c.file}` : c.youtube ? ' · YouTube' : ''}</small>
                </div></div></td>
                <td className="tnum">{fmtClock(c.duration)}</td>
                <td><div className="table-progress"><Bar pct={cs.avg} /><b className="tnum">{cs.avg}%</b></div></td>
                <td className="tnum">{cs.done} / {n}</td>
                <td>{fmtDate(c.uploadedAt)}</td>
                <td><button className="switch" onClick={() => toggleRequired(c)} aria-pressed={c.required} aria-label={`Required: ${c.title}`}><span /></button></td>
                <td><div className="row-actions">
                  <button className="row-link" onClick={() => openModal(<CourseDrawer id={c.id} />, 'drawer')}>Who watched</button>
                  <button className={`row-link danger${armed === c.id ? ' armed' : ''}`} onClick={() => remove(c)}>{armed === c.id ? 'Confirm remove' : 'Remove'}</button>
                </div></td>
              </tr>
            );
          })}
          {!data.courses.length && <tr className="empty-row"><td colSpan={7}>No courses yet. Upload the first one.</td></tr>}
        </tbody>
      </table></div></section>
    </>
  );
}

const LEGEND = [['h0', 'Not started'], ['h1', '1–24%'], ['h2', '25–49%'], ['h3', '50–74%'], ['h4', `75–${COMPLETE_AT - 1}%`], ['h5', `${COMPLETE_AT}%+ completed`]];

export function People() {
  const { data, openModal } = usePortal();
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('All');
  const depts = ['All', ...new Set(data.users.map((u) => u.dept || '–'))];
  const courses = [...data.courses].sort((a, b) => a.uploadedAt - b.uploadedAt);
  const needle = q.trim().toLowerCase();
  const rows = data.users
    .filter((p) => (dept === 'All' || (p.dept || '–') === dept) && (!needle || p.name.toLowerCase().includes(needle) || p.email.includes(needle)))
    .map((p) => ({ p, s: userStats(data.progress, data.courses, p.id) }))
    .sort((a, b) => b.s.pct - a.s.pct);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Admin</div><h1>People & progress</h1>
          <p className="heading-copy">How much of each course every employee has watched. People appear here after they first sign in. Select a person for their full profile.</p>
        </div>
      </div>
      <section className="panel">
        <div className="toolbar">
          <div className="toolbar-left">
            <input className="search" type="search" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" />
            <select className="select" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department">{depts.map((d) => <option key={d}>{d}</option>)}</select>
          </div>
          <div className="heat-legend" aria-label="Colour key">{LEGEND.map(([k, l]) => <span key={k}><i className={k} />{l}</span>)}</div>
        </div>
        <div className="table-wrap"><table className="heat-table">
          <thead><tr><th>Employee</th><th>Profile completion</th>{courses.map((c) => <th key={c.id} className="hc" title={c.title}><span>{c.short}</span></th>)}</tr></thead>
          <tbody>
            {rows.map(({ p, s }) => (
              <tr key={p.id} className="clickable" onClick={() => openModal(<PersonDrawer id={p.id} />, 'drawer')}>
                <td><div className="employee"><Avatar user={p} /><span><strong>{p.name}</strong><small>{p.dept || 'No department'} · {fmtRel(s.last)}</small></span></div></td>
                <td className="overall-cell"><div className="table-progress"><Bar pct={s.pct} /><b className="tnum">{s.pct}%</b></div></td>
                {courses.map((c) => {
                  const v = pctOf(data.progress, p.id, c);
                  return <td key={c.id} className="hc"><span className={`heat ${heatClass(v)}`} data-tip={`${p.name} · ${c.title}: ${v}% watched`}>{v ? `${v}%` : '–'}</span></td>;
                })}
              </tr>
            ))}
            {!rows.length && <tr className="empty-row"><td colSpan={courses.length + 2}>No one matches that search.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </>
  );
}

function PersonDrawer({ id }) {
  const { data, me, setRole, toast } = usePortal();
  const [busy, setBusy] = useState(false);
  const p = data.users.find((u) => u.id === id);
  if (!p) return null;
  const st = userStats(data.progress, data.courses, id);
  const req = data.courses.filter((c) => c.required);
  const reqLeft = req.filter((c) => pctOf(data.progress, id, c) < COMPLETE_AT);
  const changeRole = async () => {
    setBusy(true);
    const role = p.role === 'admin' ? 'employee' : 'admin';
    try {
      await setRole(p.id, role);
      toast(role === 'admin' ? `${p.name} is now an admin` : `${p.name} is no longer an admin`);
    } catch (e) {
      toast(e.message);
    }
    setBusy(false);
  };
  return (
    <>
      <ModalHeader>
        <div className="acct-card"><Avatar user={p} size="lg" /><div><strong>{p.name}</strong><small>{p.email}{p.dept ? ` · ${p.dept}` : ''}</small></div></div>
      </ModalHeader>
      <div className="drawer-stats">
        <Ring pct={st.pct} label="complete" size="sm" />
        <div className="stat-list">
          <div className="stat"><span>Completed</span><strong className="tnum">{st.done} / {data.courses.length}</strong></div>
          <div className="stat"><span>Video watched</span><strong className="tnum">{fmtDur(st.watched)}</strong></div>
          <div className="stat"><span>Last active</span><strong>{fmtRel(st.last)}</strong></div>
          <div className="stat"><span>Required</span><strong className={reqLeft.length ? 'status-crit' : 'status-good'} style={{ fontSize: 15 }}>{req.length ? (reqLeft.length ? `● ${reqLeft.length} not done` : '✓ All done') : 'None set'}</strong></div>
        </div>
      </div>
      <div className="role-row">
        <span><strong>Portal role:</strong> {p.role === 'admin' ? 'Admin' : 'Employee'}</span>
        {p.id !== me.id && <button className="ghost-button" onClick={changeRole} disabled={busy}>{p.role === 'admin' ? 'Remove admin access' : 'Make admin'}</button>}
      </div>
      <h3>Course by course</h3>
      <ProgressRows user={p} clickable={false} />
    </>
  );
}

function CourseDrawer({ id }) {
  const { data } = usePortal();
  const c = data.courses.find((x) => x.id === id);
  if (!c) return null;
  const cs = courseStats(data.progress, data.users, c);
  const rows = data.users.map((u) => ({ u, p: pctOf(data.progress, u.id, c) })).sort((a, b) => b.p - a.p);
  const started = rows.filter((r) => r.p > 0);
  const notStarted = rows.filter((r) => r.p === 0);
  return (
    <>
      <ModalHeader eyebrow={`${c.category} · ${fmtDur(c.duration)}${c.required ? ' · Required' : ''}`} title={c.title} />
      <div className="drawer-stats">
        <Ring pct={cs.avg} label="avg watched" size="sm" />
        <div className="stat-list">
          <div className="stat"><span>Completed</span><strong className="tnum">{cs.done} / {data.users.length}</strong></div>
          <div className="stat"><span>Started</span><strong className="tnum">{cs.started} / {data.users.length}</strong></div>
        </div>
      </div>
      <h3>Share watched, per person</h3>
      <div className="people-bars">
        {started.length ? started.map(({ u, p }) => (
          <div className="people-bar" key={u.id}>
            <div className="employee"><Avatar user={u} /><span><strong>{u.name}</strong><small>{u.dept || '–'}</small></span></div>
            <Bar pct={p} /><span className="prog-val tnum">{p}%</span>
          </div>
        )) : <p className="muted">Nobody has started this course yet.</p>}
      </div>
      {notStarted.length > 0 && <div><h3>Not started ({notStarted.length})</h3><p className="not-started" style={{ marginTop: 6 }}>{notStarted.map(({ u }) => u.name).join(', ')}</p></div>}
    </>
  );
}
