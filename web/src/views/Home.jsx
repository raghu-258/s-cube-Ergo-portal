import { useNavigate } from 'react-router-dom';
import { CelebrationBanner, CelebrationsPanel } from '../components/Celebrations.jsx';
import { Bar, CourseCard, Ring, StatusChip } from '../components/ui.jsx';
import { COMPLETE_AT, byNewest, firstName, fmtDur, greeting, todayLabel } from '../lib/format.js';
import { continueCourse, pctOf, userStats } from '../lib/progress.js';
import { usePortal } from '../portal.jsx';

export function Home() {
  const { data, me } = usePortal();
  const navigate = useNavigate();
  const { progress, courses } = data;
  const st = userStats(progress, courses, me.id);
  const next = continueCourse(progress, courses, me.id);
  const req = courses.filter((c) => c.required);
  const reqDone = req.filter((c) => pctOf(progress, me.id, c) >= COMPLETE_AT).length;
  const order = [...courses].sort((a, b) => {
    const rank = (c) => { const p = pctOf(progress, me.id, c); return p > 0 && p < COMPLETE_AT ? 0 : p === 0 ? 1 : 2; };
    return rank(a) - rank(b) || byNewest(a, b);
  }).slice(0, 6);

  return (
    <>
      <CelebrationBanner />
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="live-dot" />{todayLabel()}</div>
          <h1>{greeting()}, {firstName(me.name)}<span className="accent-dot">.</span></h1>
          <p className="heading-copy">
            {!courses.length ? 'No courses have been published yet.' : st.pct >= 100 ? 'You have watched every course in the library.' : `You have watched ${st.pct}% of the AI course library so far.`}
          </p>
        </div>
        <button className="primary-button" onClick={() => navigate('/library')}><span>▷</span> Browse all courses</button>
      </div>
      <section className="hero-grid">
        <FeatureCard next={next} />
        <article className="metric-card">
          <div className="metric-head"><span>Profile completion</span><button className="text-button" onClick={() => navigate('/profile')}>View profile <span>↗</span></button></div>
          <div className="ring-row">
            <Ring pct={st.pct} label="watched" />
            <div className="ring-legend">
              <span><b className="tnum">{st.done}</b> of {courses.length} courses completed</span>
              <span><b className="tnum">{fmtDur(st.watched)}</b> of video watched</span>
            </div>
          </div>
          <p className="metric-sub">Share of all course video you have watched. Your admin sees the same number.</p>
        </article>
        <article className="metric-card">
          <div className="metric-head">
            <span>Required courses</span>
            {req.length > 0 && <span className={reqDone === req.length ? 'status-good' : 'status-crit'}>{reqDone === req.length ? '✓ All done' : `● ${req.length - reqDone} to finish`}</span>}
          </div>
          {req.length ? (
            <>
              <div className="metric-number tnum">{reqDone}<span>/{req.length}</span></div>
              <div className="metric-sub">required courses completed</div>
              <ul className="req-list">
                {req.map((c) => (
                  <li key={c.id}><button onClick={() => navigate(`/watch/${c.id}`)}><span className="req-title">{c.title}</span><StatusChip pct={pctOf(progress, me.id, c)} /></button></li>
                ))}
              </ul>
            </>
          ) : <p className="metric-sub">No required courses right now.</p>}
        </article>
      </section>
      <CelebrationsPanel />
      {courses.length > 0 && (
        <section>
          <div className="section-head"><h2>Your courses</h2><button className="text-button" onClick={() => navigate('/library')}>See all {courses.length} <span>↗</span></button></div>
          <div className="course-grid">{order.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        </section>
      )}
    </>
  );
}

function FeatureCard({ next }) {
  const { data, me } = usePortal();
  const navigate = useNavigate();
  const shell = (content) => (
    <article className="feature-card"><div className="orbit o1" /><div className="orbit o2" /><div className="feature-content">{content}</div></article>
  );
  if (!data.courses.length) {
    return shell(<>
      <div className="card-kicker"><span className="status-pill">COMING SOON</span></div>
      <h2>Courses are on their way.</h2><p>New courses appear here as soon as an admin publishes them.</p>
    </>);
  }
  if (!next) {
    return shell(<>
      <div className="card-kicker"><span className="status-pill">ALL CAUGHT UP</span></div>
      <h2>You have completed every course.</h2><p>New courses appear here as soon as they are published.</p>
      <button className="meet-button" onClick={() => navigate('/profile')}>View your profile</button>
    </>);
  }
  const { c, p } = next;
  const pos = ((data.progress[me.id] || {})[c.id] || {}).pos || 0;
  const ch = c.chapters.filter((x) => x.at <= pos).pop() || c.chapters[0];
  return shell(<>
    <div className="card-kicker"><span className="status-pill">{p > 0 ? 'CONTINUE WATCHING' : 'UP NEXT'}</span><span className="muted-label">{c.category} · {fmtDur(c.duration)}</span></div>
    <h2>{c.title}</h2>
    <p>{p > 0 && ch ? `You stopped in chapter ${c.chapters.indexOf(ch) + 1}: ${ch.t}.` : c.desc}</p>
    <div className="feature-progress"><Bar pct={p} /><small className="tnum">{p}% watched · {fmtDur(c.duration * (1 - p / 100))} left</small></div>
    <button className="meet-button" onClick={() => navigate(`/watch/${c.id}`)}>{p > 0 ? 'Resume' : 'Start course'} ▶</button>
  </>);
}
