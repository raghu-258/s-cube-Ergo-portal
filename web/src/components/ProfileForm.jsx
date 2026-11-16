import { useEffect, useRef, useState } from 'react';
import { MONTHS, isoDate, startOfToday } from '../lib/celebrations.js';
import { firstName } from '../lib/format.js';
import { usePortal } from '../portal.jsx';

// A profile is complete once it has a department, a birthday, and a joining date (or the choice to skip it).
export const profileIncomplete = (p) => !p || !p.dept || !p.birthday || (!p.joined && !p.joinedSkipped);

// Name, department, birthday and joining date. Used on My profile and in the after-sign-in popup.
// requireAll: every field must be filled in (the sign-in gate). On My profile the dates stay optional.
export function ProfileForm({ onSaved, secondary, requireAll }) {
  const { data, saveProfile, toast } = usePortal();
  const p = data.profile;
  const [form, setForm] = useState({
    name: p.name, dept: p.dept,
    day: p.birthday ? String(p.birthday.d) : '', month: p.birthday ? String(p.birthday.m) : '',
    joined: p.joined || '', skipJoined: !p.joined && !!p.joinedSkipped,
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
    if (requireAll && !form.dept.trim()) return setError('Add your department.');
    if (requireAll && (!d || !m)) return setError('Pick the day and month of your birthday.');
    const joined = form.skipJoined ? '' : form.joined;
    if (requireAll && !joined && !form.skipJoined) return setError('Add your joining date, or tick “I’d rather not share this”.');
    if (!d !== !m) return setError('Pick both the day and the month of your birthday, or leave both empty.');
    if (d && new Date(2000, m - 1, d).getMonth() !== m - 1) return setError(`${MONTHS[m - 1]} doesn’t have ${d} days.`);
    if (joined && (joined > today || joined < '1950-01-01')) return setError('Enter a joining date that isn’t in the future.');
    setBusy(true);
    try {
      await saveProfile({
        name: form.name.trim(), dept: form.dept.trim(), birthday: d ? { m, d } : null,
        joined: joined || null, joinedSkipped: form.skipJoined, optOut: false,
      });
      toast('Your details are saved');
      setBusy(false);
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
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
      <div className="field">
        <label htmlFor="pf-joined">Joining date at S Cube</label>
        <input id="pf-joined" type="date" min="1950-01-01" max={today} value={form.skipJoined ? '' : form.joined} onChange={set('joined')} disabled={form.skipJoined} />
        <label className="check" htmlFor="pf-skip-joined">
          <input id="pf-skip-joined" type="checkbox" checked={form.skipJoined} onChange={set('skipJoined')} /> I’d rather not share this
        </label>
      </div>
      {error && <p className="field-error full">{error}</p>}
      <div className="modal-actions full">
        {secondary}
        <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button>
      </div>
    </form>
  );
}

// Required step after sign-in: a centered popup over the (blocked) dashboard until the profile is complete.
// It has no close button and ignores Escape. Once saved, the reloaded profile is complete and it disappears.
export function ProfileGate() {
  const { me, signOut } = usePortal();
  const ref = useRef(null);
  useEffect(() => {
    document.body.classList.add('locked');
    // Start on the first empty field (name is usually filled in already).
    const first = ref.current && [...ref.current.querySelectorAll('input, select')].find((el) => !el.value);
    if (first) first.focus({ preventScroll: true });
    return () => document.body.classList.remove('locked');
  }, []);
  return (
    <>
      <div className="gate-backdrop" />
      <div className="modal gate" role="dialog" aria-modal="true" aria-labelledby="gate-title" ref={ref}>
        <div className="gate-head">
          <img className="gate-mark" src="/scube-mark.png" alt="" width="40" height="40" />
          <div>
            <div className="eyebrow">Welcome to S Cube, {firstName(me.name)}</div>
            <h2 id="gate-title">Complete your profile</h2>
          </div>
        </div>
        <div className="gate-body">
          <p className="gate-copy">
            One quick step before you start. Your birthday and joining date let the team celebrate with you.
            Only the day and month of your birthday are shared.
          </p>
          <ProfileForm requireAll secondary={<button type="button" className="text-button gate-signout" onClick={signOut}>Sign out</button>} />
        </div>
      </div>
    </>
  );
}
