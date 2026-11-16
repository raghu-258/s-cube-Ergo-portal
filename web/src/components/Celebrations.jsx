import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CELEBRATE_DAYS, celebrationItems, fmtDay, upcomingCelebrations, whenLabel } from '../lib/celebrations.js';
import { firstName, toneOf } from '../lib/format.js';
import { usePortal } from '../portal.jsx';
import { Avatar, ModalHeader } from './ui.jsx';

export function CelebrationsPanel() {
  const { data, me, openModal } = usePortal();
  const navigate = useNavigate();
  const list = upcomingCelebrations(data.celebrations);
  const withinWindow = list.every((x) => x.days <= CELEBRATE_DAYS);
  return (
    <article className="panel">
      <div className="panel-heading">
        <div><div className="eyebrow">{withinWindow && list.length ? `Next ${CELEBRATE_DAYS} days` : 'Coming up'}</div><h2>Upcoming celebrations</h2></div>
        <div className="celebrate-actions">
          {me.role === 'admin' && <button className="text-button" onClick={() => openModal(<TestMailModal />)}>Send test email <span>✉</span></button>}
          <button className="text-button" onClick={() => navigate('/profile')}>Add your dates <span>↗</span></button>
        </div>
      </div>
      {list.length ? (
        <div className="celebrate-list">
          {list.map((x) => {
            const person = data.users.find((u) => u.email === x.email) || { name: x.name, tone: toneOf(x.email) };
            return (
              <div className={`celebrate-row${x.days === 0 ? ' today' : ''}`} key={`${x.type}-${x.email}`}>
                <Avatar user={person} />
                <div className="activity-copy">
                  <strong>{x.name}{x.email === me.email ? ' (you)' : ''}</strong>
                  <span>{x.type === 'birthday' ? '🎂 Birthday' : `🎉 ${x.years}-year work anniversary`}{x.dept ? ` · ${x.dept}` : ''}</span>
                </div>
                <span className="celebrate-when"><b>{whenLabel(x.days)}</b><small>{fmtDay(x.date)}</small></span>
              </div>
            );
          })}
        </div>
      ) : <p className="muted">Nobody has added a birthday or joining date yet. Add yours under My profile to appear here.</p>}
    </article>
  );
}

// Greeting at the top of your own home page on your birthday or work anniversary.
export function CelebrationBanner() {
  const { data, me } = usePortal();
  return celebrationItems(data.celebrations).filter((x) => x.days === 0 && x.email === me.email).map((x) => (
    <div className="celebrate-banner" key={x.type}>
      {x.type === 'birthday'
        ? `🎂 Happy birthday, ${firstName(me.name)}! Everyone at Scube wishes you a wonderful day.`
        : `🎉 Happy ${x.years}-year work anniversary, ${firstName(me.name)}! Thank you for being part of Scube.`}
    </div>
  ));
}

function TestMailModal() {
  const { me, data, sendTestMail, closeModal, toast } = usePortal();
  const allowed = data.testEmailRecipients || [];
  const [email, setEmail] = useState(allowed.includes(me.email) ? me.email : allowed[0] || me.email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await sendTestMail(email.trim().toLowerCase());
      closeModal();
      toast(res.real ? `Sent the ${res.forDate} celebration to ${res.to} as a test` : `No saved dates yet, so sample test emails were sent to ${res.to}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <ModalHeader eyebrow="Celebrations" title="Send a test email" />
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="muted">Sends the next upcoming birthday or work anniversary right now, exactly as everyone will get it on the day, but marked [TEST] and only to the address below. If nobody has saved dates yet, it sends samples.</p>
        <div className="field">
          <label htmlFor="test-email">Send to</label>
          {allowed.length
            ? <select id="test-email" value={email} onChange={(e) => setEmail(e.target.value)}>{allowed.map((a) => <option key={a}>{a}</option>)}</select>
            : <input id="test-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </div>
        <p className="reach-note">For safety, test emails only go to addresses listed in TEST_EMAIL_RECIPIENTS in the server settings.</p>
        {error && <p className="field-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={closeModal}>Cancel</button>
          <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send test email'}</button>
        </div>
      </form>
    </>
  );
}
