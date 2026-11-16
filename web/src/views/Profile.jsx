import { ProfileForm } from '../components/ProfileForm.jsx';
import { Avatar, ProgressRows, Ring } from '../components/ui.jsx';
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
  const { data } = usePortal();
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">About you</div><h2>Your details, birthday & work anniversary</h2>
          <p>On your birthday and work anniversary everyone at Scube gets an email wishing you well, and you show up in Upcoming celebrations. Only the day and month of your birthday are shared, never the year.</p>
        </div>
      </div>
      <ProfileForm key={JSON.stringify(data.profile)} />
    </section>
  );
}
