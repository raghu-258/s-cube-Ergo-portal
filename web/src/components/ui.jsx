import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMPLETE_AT, THEMES, fmtClock, fmtDur, fmtRel, initials, isNew } from '../lib/format.js';
import { pctOf } from '../lib/progress.js';
import { usePortal } from '../portal.jsx';

export const Avatar = ({ user, size = '' }) => (
  <span className={`avatar avatar-${user.tone || 'teal'} ${size}`}>{initials(user.name)}</span>
);

export const Bar = ({ pct, id }) => <span className="bar"><span id={id} style={{ width: `${pct}%` }} /></span>;

export function StatusChip({ pct }) {
  if (pct >= COMPLETE_AT) return <span className="chip chip-done">✓ Completed</span>;
  if (pct > 0) return <span className="chip chip-prog">◷ In progress</span>;
  return <span className="chip chip-none">○ Not started</span>;
}

export const Ring = ({ pct, label, size = '' }) => (
  <div className={`ring ${size}`} style={{ '--p': pct }} role="img" aria-label={`${pct}% ${label}`}>
    <div className="ring-inner"><strong className="tnum">{pct}%</strong><small>{label}</small></div>
  </div>
);

export function Thumb({ course }) {
  const t = THEMES[course.theme % THEMES.length];
  return (
    <span className="thumb" style={{ '--t1': t.b, '--t2': t.c, '--tink': t.ink }}>
      <span className="thumb-code">AI</span><span className="play-button">▶</span>
      <span className="thumb-dur tnum">{fmtClock(course.duration)}</span>
    </span>
  );
}

export const CourseTags = ({ course }) => (
  <span className="cc-tags">
    {course.required && <span className="tag tag-req">Required</span>}
    {isNew(course) && <span className="tag tag-new">New</span>}
    <span className="tag">{course.category}</span>
  </span>
);

export function CourseCard({ course }) {
  const { data, me } = usePortal();
  const navigate = useNavigate();
  const p = pctOf(data.progress, me.id, course);
  const left = course.duration * (1 - p / 100);
  const state = p >= COMPLETE_AT ? ['✓ Completed', fmtDur(course.duration)] : p > 0 ? [`${p}% watched`, `${fmtDur(left)} left`] : ['Not started', fmtDur(course.duration)];
  return (
    <button className="course-card" onClick={() => navigate(`/watch/${course.id}`)}>
      <Thumb course={course} />
      <span className="cc-body">
        <CourseTags course={course} />
        <span className="cc-title">{course.title}</span>
        <Bar pct={p} />
        <span className="cc-meta tnum"><span>{state[0]}</span><span>{state[1]}</span></span>
      </span>
    </button>
  );
}

export function ProgressRows({ user, clickable }) {
  const { data } = usePortal();
  const navigate = useNavigate();
  return (
    <div className="prog-list">
      {data.courses.map((c) => {
        const p = pctOf(data.progress, user.id, c);
        const body = (
          <>
            {clickable && <Thumb course={c} />}
            <span className="prog-title"><strong>{c.title}</strong><small>{c.category} · {fmtDur(c.duration)}{c.required ? ' · Required' : ''}</small></span>
            <Bar pct={p} />
            <span className="prog-val tnum">{p}%</span>
            {clickable && <StatusChip pct={p} />}
          </>
        );
        return clickable
          ? <button key={c.id} className="prog-row" onClick={() => navigate(`/watch/${c.id}`)}>{body}</button>
          : <div key={c.id} className="prog-row">{body}</div>;
      })}
      {!data.courses.length && <p className="muted">No courses yet.</p>}
    </div>
  );
}

const ACTIVITY = {
  completed: ['completed', '✓'], started: ['started', '▶'], watched: ['watched part of', '▶'], published: ['published', '↑'],
};

export function ActivityList({ limit }) {
  const { data } = usePortal();
  const userById = (id) => data.users.find((u) => u.id === id);
  const courseById = (id) => data.courses.find((c) => c.id === id);
  const rows = data.events.filter((e) => userById(e.user) && courseById(e.course) && ACTIVITY[e.type]).slice(0, limit);
  if (!rows.length) return <p className="muted">No activity yet.</p>;
  return (
    <div className="activity-list">
      {rows.map((e, i) => {
        const u = userById(e.user), c = courseById(e.course);
        return (
          <div className="activity-row" key={`${e.user}-${e.course}-${e.type}-${e.at}-${i}`}>
            <Avatar user={u} />
            <div className="activity-copy"><strong>{u.name}</strong><span>{ACTIVITY[e.type][0]} <b>{c.title}</b></span></div>
            <span className="activity-time">{fmtRel(e.at)}</span>
            <span className={`activity-icon ${e.type}`}>{ACTIVITY[e.type][1]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ModalHeader({ eyebrow, title, children }) {
  const { closeModal } = usePortal();
  return (
    <div className="modal-head">
      {children || <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>}
      <button className="x" onClick={closeModal} aria-label="Close">×</button>
    </div>
  );
}

export function ModalHost() {
  const { modal, closeModal } = usePortal();
  const ref = useRef(null);
  useEffect(() => {
    if (!modal) return undefined;
    document.body.classList.add('locked');
    const first = ref.current && ref.current.querySelector('input, select, textarea, button:not(.x)');
    if (first) first.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.classList.remove('locked'); document.removeEventListener('keydown', onKey); };
  }, [modal, closeModal]);
  if (!modal) return null;
  return (
    <>
      <div className="backdrop" onClick={closeModal} />
      <div className={modal.kind} role="dialog" aria-modal="true" ref={ref}>{modal.content}</div>
    </>
  );
}

export function Toast() {
  const { toastState } = usePortal();
  return <div className={`toast${toastState.show ? ' show' : ''}`} role="status" aria-live="polite">{toastState.msg}</div>;
}

// Shows the text of any element with a data-tip attribute (used by the heatmap and charts).
export function Tooltip() {
  const ref = useRef(null);
  useEffect(() => {
    const tip = ref.current;
    const show = (el) => {
      tip.textContent = el.dataset.tip;
      tip.hidden = false;
      const r = el.getBoundingClientRect();
      const w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = `${Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8)}px`;
      tip.style.top = `${r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8}px`;
    };
    const hide = () => { tip.hidden = true; };
    const over = (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el); else hide(); };
    const focus = (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el); };
    document.addEventListener('mouseover', over);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', hide);
    window.addEventListener('scroll', hide, { passive: true });
    return () => {
      document.removeEventListener('mouseover', over);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', hide);
      window.removeEventListener('scroll', hide);
    };
  }, []);
  return <div className="tooltip" ref={ref} role="tooltip" hidden />;
}
