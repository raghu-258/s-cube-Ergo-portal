import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from '../lib/api.js';
import { CATEGORIES, fmtClock, parseYouTube } from '../lib/format.js';
import { usePortal } from '../portal.jsx';
import { ModalHeader } from './ui.jsx';

export function UploadModal() {
  const { data, me, requestUpload, publishCourse, closeModal, toast } = usePortal();
  const navigate = useNavigate();
  const cats = [...new Set([...CATEGORIES, ...data.courses.map((c) => c.category)])];
  const [file, setFile] = useState(null); // { file, duration, info }
  const [form, setForm] = useState({ yt: '', title: '', category: cats[0], mins: '', desc: '', required: false });
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null); // null | 'uploading' | 'publishing'
  const [progress, setProgress] = useState(0);
  const urlRef = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  // Reads the video's length from the file itself.
  const chooseFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('video/')) { setFile({ file: null, info: `${f.name} isn't a video file. Choose an MP4, WebM or MOV.` }); return; }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(f);
    urlRef.current = url;
    const sizeMb = (f.size / 1e6).toFixed(1);
    setFile({ file: f, duration: 0, info: `${f.name} · ${sizeMb} MB · reading length…` });
    setForm((x) => ({ ...x, title: x.title || f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() }));
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      if (urlRef.current !== url || !isFinite(v.duration)) return;
      setFile({ file: f, duration: v.duration, info: `✓ ${f.name} · ${fmtClock(v.duration)} · ${sizeMb} MB` });
      setForm((x) => ({ ...x, mins: (v.duration / 60).toFixed(1) }));
    };
    v.onerror = () => setFile({ file: f, duration: 0, info: `${f.name} · couldn't read the length. Enter it below.` });
    v.src = url;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const title = form.title.trim();
    const youtube = !file?.file && form.yt.trim() ? parseYouTube(form.yt) : null;
    if (!file?.file && form.yt.trim() && !youtube) return setError('That doesn’t look like a YouTube video link. Paste a link like https://youtu.be/kuGjypoJKwk.');
    if (!file?.file && !youtube) return setError('Choose a video file or paste a YouTube link.');
    if (!title) return setError('Add a course title.');
    // For YouTube links the exact length is read when the video first plays.
    let secs = file?.duration ? Math.round(file.duration) : Math.round(parseFloat(form.mins) * 60);
    const durationPending = !secs && !!youtube;
    if (durationPending) secs = 60;
    if (!secs || secs < 10) return setError('Add the video length in minutes.');

    const desc = form.desc.trim() || `A new course from ${me.name}.`;
    const sentences = desc.split(/(?<=[.!?])\s+/).filter(Boolean);
    const parts = ['Introduction', 'Key ideas', 'In practice', 'Recap'];
    const meta = {
      title, short: title.length > 18 ? `${title.slice(0, 16).trim()}…` : title, category: form.category, desc,
      duration: secs, durationPending, required: form.required, youtube,
      chapters: parts.map((t, i) => ({ t, at: Math.round((i * secs) / parts.length), points: i === 0 ? sentences.slice(0, 3) : [title] })),
    };
    try {
      if (file?.file) {
        setBusy('uploading');
        const target = await requestUpload(file.file);
        await uploadFile(target, file.file, setProgress);
        meta.videoKey = target.key;
        meta.fileName = file.file.name;
      }
      setBusy('publishing');
      await publishCourse(meta);
      closeModal();
      toast(`Published “${title}” to all ${data.users.length} employees`);
      navigate('/admin/courses');
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  };

  return (
    <>
      <ModalHeader eyebrow="Admin" title="Upload a course" />
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label
          className={`drop${over ? ' over' : ''}`} htmlFor="up-file"
          onDragEnter={() => setOver(true)} onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); chooseFile(e.dataTransfer.files[0]); }}
        >
          <span className="drop-icon">↑</span><strong>Drop a video here or click to choose</strong>
          <span>MP4, WebM or MOV, up to 5 GB. The length is read from the file.</span>
          <input id="up-file" type="file" accept="video/*" disabled={!!busy} onChange={(e) => chooseFile(e.target.files[0])} />
        </label>
        {file && <div className="file-info">{file.info}</div>}
        {!file?.file && (
          <div className="field"><label htmlFor="up-yt">Or paste a YouTube link</label><input id="up-yt" type="url" placeholder="https://youtu.be/…" value={form.yt} onChange={set('yt')} /></div>
        )}
        <div className="form-grid">
          <div className="field full"><label htmlFor="up-title">Course title</label><input id="up-title" type="text" placeholder="e.g. AI for faster month-end close" value={form.title} onChange={set('title')} /></div>
          <div className="field"><label htmlFor="up-cat">Category</label><select id="up-cat" value={form.category} onChange={set('category')}>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label htmlFor="up-mins">Length (minutes)</label><input id="up-mins" type="number" min="1" step="0.5" placeholder={form.yt ? 'read from YouTube' : '10'} value={form.mins} onChange={set('mins')} readOnly={!!file?.duration} /></div>
          <div className="field full"><label htmlFor="up-desc">Short description</label><textarea id="up-desc" placeholder="What will people be able to do after watching?" value={form.desc} onChange={set('desc')} /></div>
          <label className="check full" htmlFor="up-req"><input id="up-req" type="checkbox" checked={form.required} onChange={set('required')} /> Required for all employees</label>
        </div>
        <p className="reach-note">Publishing makes this course visible to all {data.users.length} employees straight away. Their progress shows up in People & progress.</p>
        {busy === 'uploading' && (
          <div className="upload-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span className="bar"><span style={{ width: `${Math.round(progress * 100)}%` }} /></span>
            <small className="tnum">Uploading… {Math.round(progress * 100)}%. Keep this window open.</small>
          </div>
        )}
        {error && <p className="field-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={closeModal} disabled={!!busy}>Cancel</button>
          <button type="submit" className="primary-button" disabled={!!busy}>{busy === 'uploading' ? 'Uploading…' : busy === 'publishing' ? 'Publishing…' : 'Publish course'}</button>
        </div>
      </form>
    </>
  );
}
