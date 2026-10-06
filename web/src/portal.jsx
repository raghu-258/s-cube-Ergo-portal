import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './lib/api.js';
import { COMPLETE_AT, toneOf } from './lib/format.js';
import { pctOfRanges } from './lib/progress.js';

const PortalContext = createContext(null);
export const usePortal = () => useContext(PortalContext);

const SYNC_MS = 15000; // how often watch progress is saved while playing
const RETRY_MS = 30000;
const REFRESH_MS = 60000; // dashboards reload this often so admins see live numbers

const withTones = (d) => ({ ...d, users: d.users.map((u) => ({ ...u, tone: toneOf(u.email) })) });

export function PortalProvider({ children }) {
  const [status, setStatus] = useState('loading'); // loading | signedOut | ready | error
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null);
  const [toastState, setToastState] = useState({ msg: '', show: false });

  const dataRef = useRef(null);
  dataRef.current = data;
  // Progress not yet saved: courseId -> { ranges, pos, watched }
  const pending = useRef({});
  const sync = useRef({ timer: null, inflight: 0 });
  const toastTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastState({ msg, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState((s) => ({ ...s, show: false })), 2800);
  }, []);

  const load = useCallback(async () => {
    try {
      setConfig(await api('/config'));
      setData(withTones(await api('/bootstrap')));
      setStatus('ready');
    } catch (e) {
      if (e.status === 401) setStatus('signedOut');
      else { setError(e.message); setStatus('error'); }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---- saving watch progress ----
  const flush = useCallback(({ keepalive } = {}) => {
    clearTimeout(sync.current.timer);
    sync.current.timer = null;
    const entries = Object.entries(pending.current).map(([course, p]) => ({ course, ...p }));
    pending.current = {};
    if (!entries.length) return Promise.resolve();
    sync.current.inflight++;
    return api('/progress', { method: 'POST', body: { entries }, keepalive })
      .catch((e) => {
        // Keep anything newer that arrived meanwhile; otherwise retry with what we had.
        entries.forEach(({ course, ...p }) => { if (!pending.current[course]) pending.current[course] = p; });
        if (e.status === 401) setStatus('signedOut');
        else if (!sync.current.timer) sync.current.timer = setTimeout(() => flushRef.current(), RETRY_MS);
      })
      .finally(() => { sync.current.inflight--; });
  }, []);
  const flushRef = useRef(flush);
  flushRef.current = flush;

  const schedule = useCallback((ms) => {
    if (ms === 0) { flushRef.current(); return; }
    if (!sync.current.timer) sync.current.timer = setTimeout(() => flushRef.current(), ms);
  }, []);

  // Called by the player about once a second with the full list of watched parts.
  const updateProgress = useCallback((cid, ranges, pos) => {
    const d = dataRef.current;
    if (!d) return;
    const prev = d.progress[d.me] && d.progress[d.me][cid];
    const course = d.courses.find((c) => c.id === cid);
    const done = !!(prev && prev.done) || (!!course && pctOfRanges(ranges, course) >= COMPLETE_AT);
    pending.current[cid] = { ...pending.current[cid], ranges, pos };
    setData((cur) => ({
      ...cur,
      progress: { ...cur.progress, [cur.me]: { ...(cur.progress[cur.me] || {}), [cid]: { ranges, pos, last: Date.now(), done } } },
    }));
    if (done && !(prev && prev.done)) {
      toast(`✓ Completed: ${course.title}`);
      schedule(0);
    } else schedule(SYNC_MS);
  }, [schedule, toast]);

  // Called when someone leaves a course they watched part of: logs "watched part of" for the admin feed.
  const leaveCourse = useCallback((cid) => {
    const d = dataRef.current;
    const p = d && d.progress[d.me] && d.progress[d.me][cid];
    const base = pending.current[cid] || (p && { ranges: p.ranges, pos: p.pos });
    if (!base) return;
    pending.current[cid] = { ...base, watched: true };
    flushRef.current();
  }, []);

  useEffect(() => {
    const onHide = () => flushRef.current({ keepalive: true });
    const onVisibility = () => { if (document.visibilityState === 'hidden') onHide(); };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // ---- live refresh ----
  const refresh = useCallback(async () => {
    if (Object.keys(pending.current).length || sync.current.inflight) return;
    try {
      const d = await api('/bootstrap');
      if (!Object.keys(pending.current).length && !sync.current.inflight) setData(withTones(d));
    } catch (e) {
      if (e.status === 401) setStatus('signedOut');
    }
  }, []);

  useEffect(() => {
    if (status !== 'ready') return undefined;
    const id = setInterval(() => {
      // Not while watching (the player owns that state) or while a form is open.
      if (document.visibilityState !== 'visible' || window.location.pathname.startsWith('/watch')) return;
      if (document.querySelector('#modal-root [role="dialog"]')) return;
      refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [status, refresh]);

  // ---- modal ----
  const openModal = useCallback((content, kind = 'modal') => setModal({ content, kind }), []);
  const closeModal = useCallback(() => setModal(null), []);

  // ---- actions ----
  const actions = useMemo(() => ({
    signInGoogle: async (credential) => {
      await api('/auth/google', { method: 'POST', body: { credential } });
      setStatus('loading');
      await load();
    },
    // Email sign-in: step 1 sends the code, step 2 checks it.
    requestCode: (email) => api('/auth/otp/request', { method: 'POST', body: { email } }),
    verifyCode: async (email, code) => {
      await api('/auth/otp/verify', { method: 'POST', body: { email, code } });
      setStatus('loading');
      await load();
    },
    signOut: async () => {
      await flushRef.current();
      await api('/auth/logout', { method: 'POST', body: {} });
      setModal(null);
      setData(null);
      setStatus('signedOut');
    },
    requestUpload: (file) => api('/uploads', { method: 'POST', body: { fileName: file.name, size: file.size, contentType: file.type } }),
    publishCourse: async (meta) => {
      const { course } = await api('/courses', { method: 'POST', body: meta });
      setData((d) => ({ ...d, courses: [...d.courses, course] }));
      return course;
    },
    setRequired: async (cid, required) => {
      const flip = (val) => setData((d) => ({ ...d, courses: d.courses.map((c) => (c.id === cid ? { ...c, required: val } : c)) }));
      flip(required);
      try {
        await api(`/courses/${cid}`, { method: 'PATCH', body: { required } });
      } catch (e) {
        flip(!required);
        throw e;
      }
    },
    removeCourse: async (cid) => {
      await api(`/courses/${cid}`, { method: 'DELETE' });
      setData((d) => ({ ...d, courses: d.courses.filter((c) => c.id !== cid), events: d.events.filter((e) => e.course !== cid) }));
    },
    saveProfile: async (profile) => {
      await flushRef.current();
      await api('/profile', { method: 'PUT', body: profile });
      setData(withTones(await api('/bootstrap')));
    },
    setRole: async (uid, role) => {
      await api(`/users/${uid}`, { method: 'PATCH', body: { role } });
      setData((d) => ({ ...d, users: d.users.map((u) => (u.id === uid ? { ...u, role } : u)) }));
    },
    // YouTube courses are published with a placeholder length; the player reports the real one.
    fixDuration: (cid, secs) => {
      setData((d) => ({
        ...d,
        courses: d.courses.map((c) => (c.id === cid && c.durationPending
          ? { ...c, duration: secs, durationPending: false, chapters: c.chapters.map((ch) => ({ ...ch, at: Math.round((ch.at * secs) / c.duration) })) }
          : c)),
      }));
      api(`/courses/${cid}/duration`, { method: 'POST', body: { secs } }).catch(() => {});
    },
    videoUrl: (cid) => api(`/courses/${cid}/video`).then((r) => r.url),
    sendTestMail: (email) => api('/celebrations/test', { method: 'POST', body: { email } }),
  }), [load]);

  const me = data ? data.users.find((u) => u.id === data.me) || null : null;

  const value = {
    status, error, config, data, me, toastState, modal,
    toast, openModal, closeModal, updateProgress, leaveCourse, flush, refresh, load,
    ...actions,
  };
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}
