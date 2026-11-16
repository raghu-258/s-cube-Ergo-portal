import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseParam } from '../components/Shell.jsx';
import { CourseTags, StatusChip } from '../components/ui.jsx';
import { COMPLETE_AT, fmtClock, fmtDate, fmtDur } from '../lib/format.js';
import { addRange, pctOf, watchedSecs } from '../lib/progress.js';
import { usePortal } from '../portal.jsx';

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
  }).catch((e) => { ytApi = null; throw e; });
  return ytApi;
}

export function Watch() {
  const course = useCourseParam();
  const navigate = useNavigate();
  if (!course) {
    return (
      <div className="panel">
        <h2>This course is no longer available</h2>
        <p className="muted">It may have been removed by an admin.</p>
        <p style={{ marginTop: 14 }}><button className="primary-button" onClick={() => navigate('/library')}>Back to library</button></p>
      </div>
    );
  }
  // A fresh player for each course.
  return <WatchCourse key={course.id} course={course} />;
}

function WatchCourse({ course }) {
  const { data, me, updateProgress, leaveCourse, flush, videoUrl, fixDuration, toast } = usePortal();
  const navigate = useNavigate();
  const mode = course.hasVideo ? 'video' : course.youtube ? 'yt' : 'none';
  const courseRef = useRef(course);
  courseRef.current = course;

  // Playback state lives in a ref (updated every frame); the UI re-renders about 8 times a second.
  const S = useRef(null);
  if (!S.current) {
    const saved = (data.progress[me.id] || {})[course.id];
    const start = saved && saved.pos < course.duration - 1 ? saved.pos : 0;
    S.current = { ranges: saved ? saved.ranges.map((r) => [...r]) : [], pos: start, t: start, playing: false, prevT: null, touched: false, dirty: false, lastPush: 0, ready: false, yt: null, speed: 1 };
  }
  const [, setFrame] = useState(0);
  const rerender = () => setFrame((n) => n + 1);
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState('');
  const videoEl = useRef(null);
  const ytWrap = useRef(null);
  const scrubEl = useRef(null);

  // ---- progress ----
  const record = (a, b) => {
    if (b - a <= 0) return;
    const s = S.current;
    s.ranges = addRange(s.ranges, a, b);
    s.pos = b;
    s.touched = true;
    s.dirty = true;
  };
  const push = () => {
    const s = S.current;
    if (!s.dirty) return;
    s.dirty = false;
    s.lastPush = Date.now();
    updateProgress(course.id, s.ranges, s.pos);
  };
  const pushNow = () => { push(); flush(); };
  const ended = () => {
    pushNow();
    const c = courseRef.current;
    const pct = Math.min(100, Math.round((watchedSecs(S.current.ranges) / c.duration) * 100));
    if (pct < COMPLETE_AT) toast('You reached the end. Watch the parts you skipped to complete this course.');
  };

  // ---- controls ----
  const seek = (t) => {
    const s = S.current;
    s.t = Math.max(0, Math.min(courseRef.current.duration, t));
    s.prevT = s.t;
    if (videoEl.current) videoEl.current.currentTime = s.t;
    if (s.yt && s.ready) s.yt.seekTo(s.t, true);
    rerender();
  };
  const togglePlay = () => {
    const s = S.current;
    const dur = courseRef.current.duration;
    if (mode === 'yt') {
      if (!s.ready) return;
      if (s.yt.getPlayerState() === 1) s.yt.pauseVideo();
      else {
        if (s.t >= dur - 0.5) seek(0);
        s.yt.setPlaybackRate(s.speed);
        s.yt.playVideo();
      }
    } else if (mode === 'video' && videoEl.current) {
      const v = videoEl.current;
      if (v.paused) {
        if (s.t >= dur - 0.05) seek(0);
        v.play().catch(() => {});
      } else v.pause();
    }
  };
  const play = () => { if (!S.current.playing) togglePlay(); };

  // Signed link for an uploaded video (valid for a few hours).
  useEffect(() => {
    if (mode !== 'video') return undefined;
    let off = false;
    videoUrl(course.id).then((u) => { if (!off) setSrc(u); }, (e) => { if (!off) setFailed(e.message); });
    return () => { off = true; };
  }, [course.id, mode, videoUrl]);

  // YouTube player. It replaces a node we create ourselves, so React never manages the iframe.
  useEffect(() => {
    if (mode !== 'yt') return undefined;
    let gone = false;
    const s = S.current;
    loadYouTubeApi().then(() => {
      if (gone || !ytWrap.current) return;
      const host = document.createElement('div');
      ytWrap.current.appendChild(host);
      s.yt = new window.YT.Player(host, {
        videoId: course.youtube,
        playerVars: { controls: 0, disablekb: 1, rel: 0, playsinline: 1, modestbranding: 1, iv_load_policy: 3, start: Math.floor(s.t) },
        events: {
          onReady: (e) => {
            if (gone) return;
            s.ready = true;
            const secs = Math.round(e.target.getDuration());
            if (courseRef.current.durationPending && secs) fixDuration(course.id, secs);
            rerender();
          },
          onStateChange: (e) => {
            if (gone) return;
            if (e.data === 1) { s.playing = true; s.prevT = s.yt.getCurrentTime(); }
            else if (e.data === 2) { s.playing = false; pushNow(); }
            else if (e.data === 0) { s.playing = false; s.t = courseRef.current.duration; ended(); }
            rerender();
          },
          onError: () => { if (!gone) setFailed('yt'); },
        },
      });
    }).catch(() => { if (!gone) setFailed('yt'); });
    return () => {
      gone = true;
      try { if (s.yt) s.yt.destroy(); } catch { /* already gone */ }
      s.yt = null;
      if (ytWrap.current) ytWrap.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id, mode]);

  // Frame loop: counts only time actually played (not jumps) toward progress.
  useEffect(() => {
    let raf;
    let lastUi = 0;
    const tick = (ts) => {
      const s = S.current;
      if (mode === 'yt') {
        const st = s.ready && s.yt && s.yt.getPlayerState ? s.yt.getPlayerState() : -1;
        // Before the first play the video is only cued and reports 0; keep the resume point.
        if (st === 1 || st === 2 || st === 3) {
          const now = s.yt.getCurrentTime() || 0;
          if (st === 1 && s.prevT != null) {
            const d = now - s.prevT;
            if (d > 0 && d < 1.5 * (s.yt.getPlaybackRate() || 1) + 0.5) record(s.prevT, now);
          }
          s.prevT = now;
          s.t = now;
        }
      } else if (mode === 'video' && videoEl.current && videoEl.current.readyState > 0) {
        const v = videoEl.current;
        const now = v.currentTime || 0;
        if (s.playing && !v.paused && !v.seeking && s.prevT != null) {
          const d = now - s.prevT;
          if (d > 0 && d < 1.5 * v.playbackRate + 0.5) record(s.prevT, now);
        }
        s.prevT = now;
        s.t = now;
      }
      if (ts - lastUi > 120) { lastUi = ts; rerender(); }
      if (s.dirty && Date.now() - s.lastPush > 1000) push();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id, mode]);

  // Save on leave: closing the tab, or navigating away.
  useEffect(() => {
    const onHide = () => { push(); flush({ keepalive: true }); };
    const onKey = (e) => {
      if (e.key !== ' ' || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName) || e.target === scrubEl.current) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('keydown', onKey);
      push();
      if (S.current.touched) leaveCourse(course.id);
      else flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  // ---- full screen (video + controls together) ----
  const stageEl = useRef(null);
  const [isFull, setIsFull] = useState(false);
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (stageEl.current && stageEl.current.requestFullscreen) stageEl.current.requestFullscreen().catch(() => {});
  };
  useEffect(() => {
    const onChange = () => setIsFull(document.fullscreenElement === stageEl.current);
    const onKey = (e) => {
      if ((e.key !== 'f' && e.key !== 'F') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      toggleFull();
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('keydown', onKey);
      if (document.fullscreenElement === stageEl.current) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // ---- scrub bar ----
  const dragging = useRef(false);
  const fromPointer = (e) => {
    const r = scrubEl.current.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * course.duration);
  };

  const s = S.current;
  const fsSupported = !!document.fullscreenEnabled; // not on iPhone Safari, which only allows native video full screen
  const pct = pctOf(data.progress, me.id, course);
  const uploader = data.users.find((u) => u.id === course.uploadedBy);
  const speeds = mode === 'yt' ? [1, 1.5, 2] : [1, 1.25, 1.5, 2];
  const ytLink = course.youtube ? `https://youtu.be/${course.youtube}` : '';
  let ci = 0;
  course.chapters.forEach((ch, i) => { if (s.t >= ch.at) ci = i; });
  const watched = Math.min(course.duration, watchedSecs(s.ranges));
  const blocked = mode === 'none' || !!failed;

  return (
    <>
      <div><button className="text-button back" onClick={() => navigate('/library')}>← Course library</button></div>
      <div className="watch-grid">
        <div className="player-col">
          {/* Video and controls go full screen together, so seeking and progress tracking keep working. */}
          <div className={`stage${isFull ? ' is-full' : ''}`} ref={stageEl}>
          <div className="player" onDoubleClick={fsSupported && !blocked ? toggleFull : undefined}>
            {mode === 'video' && src && !failed && (
              <video
                ref={videoEl} src={src} playsInline preload="metadata" onClick={togglePlay}
                onLoadedMetadata={(e) => { e.currentTarget.currentTime = S.current.t; e.currentTarget.playbackRate = S.current.speed; }}
                onPlay={(e) => { S.current.playing = true; S.current.prevT = e.currentTarget.currentTime; rerender(); }}
                onPause={() => { S.current.playing = false; pushNow(); rerender(); }}
                onEnded={() => { S.current.playing = false; ended(); rerender(); }}
                onError={() => setFailed('This video could not be played. It may still be processing, or your browser does not support its format.')}
              />
            )}
            {mode === 'yt' && !failed && <div ref={ytWrap} className="yt-wrap" />}
            {blocked && (
              <div className="player-empty">
                {failed === 'yt'
                  ? <>YouTube can’t play inside this page. <a href={ytLink} target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></>
                  : failed || 'This course has no video yet.'}
              </div>
            )}
            {!blocked && <button className="big-play" onClick={togglePlay} aria-label="Play" hidden={s.playing}>▶</button>}
          </div>
          <div className="controls">
            <button className="ctrl-play" onClick={togglePlay} aria-label={s.playing ? 'Pause' : 'Play'} disabled={blocked}>{s.playing ? '❚❚' : '▶'}</button>
            <span className="clock tnum">{fmtClock(s.t)} / {fmtClock(course.duration)}</span>
            <div
              className="scrub" ref={scrubEl} role="slider" tabIndex={0} aria-label="Seek"
              aria-valuemin={0} aria-valuemax={course.duration} aria-valuenow={Math.round(s.t)} aria-valuetext={`${fmtClock(s.t)} of ${fmtClock(course.duration)}`}
              onPointerDown={(e) => { if (blocked) return; dragging.current = true; scrubEl.current.setPointerCapture(e.pointerId); fromPointer(e); }}
              onPointerMove={(e) => { if (dragging.current) fromPointer(e); }}
              onPointerUp={() => { dragging.current = false; }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') { seek(s.t + 10); e.preventDefault(); }
                if (e.key === 'ArrowLeft') { seek(s.t - 10); e.preventDefault(); }
              }}
            >
              <div className="scrub-watched">
                {s.ranges.map(([a, b]) => <span key={a} style={{ left: `${(a / course.duration) * 100}%`, width: `${(Math.min(b, course.duration) - Math.min(a, course.duration)) / course.duration * 100}%` }} />)}
              </div>
              <div className="scrub-head" style={{ left: `${Math.min(100, (s.t / course.duration) * 100)}%` }} />
            </div>
            <label className="speed" htmlFor="speed">Speed{' '}
              <select
                id="speed" defaultValue={1}
                onChange={(e) => {
                  S.current.speed = +e.target.value;
                  if (videoEl.current) videoEl.current.playbackRate = S.current.speed;
                  if (S.current.yt && S.current.ready) S.current.yt.setPlaybackRate(S.current.speed);
                }}
              >
                {speeds.map((x) => <option key={x} value={x}>{x}×</option>)}
              </select>
            </label>
            {fsSupported && (
              <button className="ctrl-full" onClick={toggleFull} disabled={blocked}
                aria-label={isFull ? 'Exit full screen' : 'Full screen'} data-tip={isFull ? 'Exit full screen (Esc)' : 'Full screen (F)'}>
                {isFull
                  ? <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  : <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </button>
            )}
          </div>
          </div>
          <div className="scrub-legend"><span><i />Parts you have watched</span><span>Skipping ahead doesn’t count toward your progress.</span></div>
          <div className="watch-info">
            <CourseTags course={course} />
            <h1>{course.title}</h1>
            <p>{course.desc}</p>
            <div className="watch-meta">
              {fmtDur(course.duration)} · Published {fmtDate(course.uploadedAt)}{uploader ? ` by ${uploader.name}` : ''}
              {course.youtube && <> · Video: <a href={ytLink} target="_blank" rel="noopener noreferrer">{course.videoLabel || 'YouTube'}</a></>}
            </div>
          </div>
        </div>
        <aside className="watch-side">
          <section className="panel">
            <div className="eyebrow">Your progress</div>
            <div className="wp-row"><div className="wp-pct tnum">{pct}<span>%</span></div><div><StatusChip pct={pct} /></div></div>
            <span className="bar"><span style={{ width: `${pct}%` }} /></span>
            <div className="wp-sub tnum">{fmtClock(watched)} of {fmtClock(course.duration)} watched</div>
            <p className="fine">Counts as completed at {COMPLETE_AT}% watched. This number shows on your profile and in the admin report.</p>
          </section>
          <section className="panel">
            <div className="eyebrow">Chapters</div>
            <ol className="chapters">
              {course.chapters.map((ch, i) => (
                <li key={`${ch.t}-${i}`}>
                  <button className={`chapter${i === ci ? ' active' : ''}`} onClick={() => { seek(ch.at); play(); }} disabled={blocked}>
                    <span className="ch-no">{i + 1}</span><span className="ch-title">{ch.t}</span><span className="ch-time tnum">{fmtClock(ch.at)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}
