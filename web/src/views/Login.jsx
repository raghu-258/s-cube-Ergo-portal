import { useEffect, useRef, useState } from 'react';
import { usePortal } from '../portal.jsx';
import { Brand } from '../components/ui.jsx';
import { greeting } from '../lib/format.js';

const Steps = ({ at }) => (
  <div className="login-steps" aria-label={`Step ${at} of 2`}>
    <span className={at >= 1 ? 'on' : ''} /><span className={at >= 2 ? 'on' : ''} />
    <small>Step {at} of 2 · {at === 1 ? 'Your work email' : 'Enter the code'}</small>
  </div>
);

const GSI_SRC = 'https://accounts.google.com/gsi/client';

function loadGsi() {
  if (window.google && window.google.accounts) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Google sign-in could not load. Check your connection or ad blocker.'));
    document.head.appendChild(s);
  });
}

export function Login() {
  const { config } = usePortal();
  const domain = config ? config.domain : 'scube-ergo.com';
  const google = !!(config && config.googleClientId);
  const otp = !!(config && config.otpLogin);

  return (
    <div className="login">
      <section className="login-art">
        {/* decoration: drifting glows and the logo's hexagon pattern */}
        <div className="login-glow" aria-hidden="true"><span className="g1" /><span className="g2" /><span className="g3" /></div>
        <svg className="login-hex" aria-hidden="true" width="100%" height="100%">
          <defs>
            <pattern id="hexes" width="56" height="97" patternUnits="userSpaceOnUse" patternTransform="scale(.9)">
              <path d="M28 0 56 16v32L28 64 0 48V16zM28 64v33M0 97V81l28-17 28 17v16" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexes)" />
        </svg>

        <Brand light />
        <div className="login-copy">
          <div className="eyebrow on-dark">S Cube Ergonomics · Employee portal</div>
          <h1>Welcome to <br /><em>S Cube Ergonomics</em> Employee Portal.</h1>
          <p>One place for everything you need at work: company updates, resources, training and your profile. Sign in with your S Cube work account to get started.</p>
        </div>
        <div className="login-foot">
          <div className="login-stats">
            <div><strong>Humanscale</strong><span>Official partner in India</span></div>
            <div><strong>3 cities</strong><span>Bengaluru · Hyderabad · Pune</span></div>
          </div>
          <a className="login-site" href="https://www.scube-ergo.com/" target="_blank" rel="noreferrer">scube-ergo.com ↗</a>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="login-hello"><span className="wave" aria-hidden="true">👋</span>{greeting()}</div>
          {otp ? <EmailCodeSignIn domain={domain} /> : <><h2>Sign in</h2><p className="muted">Use your S Cube Google Workspace account. No separate password needed.</p></>}
          {google && <>{otp && <div className="or-divider"><span>or</span></div>}<GoogleButton /></>}
          {!google && !otp && <p className="reach-note">Sign-in isn’t set up yet. Add GOOGLE_CLIENT_ID or SMTP settings on the server.</p>}
        </div>
      </section>
    </div>
  );
}

// Step 1: work email → Continue (a 6-digit code is emailed). Step 2: enter the code.
function EmailCodeSignIn({ domain }) {
  const { requestCode, verifyCode } = usePortal();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeInput = useRef(null);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => { if (step === 'code' && codeInput.current) codeInput.current.focus(); }, [step]);

  const send = async () => {
    setError('');
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setError(`Enter your full work email, like name@${domain}.`);
    if (clean.split('@')[1] !== domain) return setError(`Only @${domain} accounts can sign in.`);
    setBusy(true);
    try {
      const res = await requestCode(clean);
      setEmail(clean);
      setCode('');
      setStep('code');
      setResendIn(res.resendIn || 60);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const verify = async (value = code) => {
    setError('');
    if (!/^\d{6}$/.test(value)) return setError('Enter the 6-digit code from the email.');
    setBusy(true);
    try {
      await verifyCode(email, value);
    } catch (e) {
      setError(e.message);
      setCode('');
      setBusy(false);
    }
  };

  if (step === 'email') {
    return (
      <form className="otp-form" onSubmit={(e) => { e.preventDefault(); send(); }} noValidate>
        <Steps at={1} />
        <h2>Sign in</h2>
        <p className="muted">Enter your S Cube work email. We’ll email you a 6-digit code. No password needed.</p>
        <div className="field">
          <label htmlFor="login-email">Work email</label>
          <input id="login-email" type="email" inputMode="email" autoComplete="email" placeholder={`name@${domain}`}
            value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="primary-button wide" type="submit" disabled={busy}>{busy ? 'Sending code…' : 'Continue'}</button>
      </form>
    );
  }

  return (
    <form className="otp-form" onSubmit={(e) => { e.preventDefault(); verify(); }} noValidate>
      <Steps at={2} />
      <h2>Check your email</h2>
      <p className="muted">We sent a 6-digit code to <b>{email}</b>. It expires in 10 minutes.</p>
      <div className="field">
        <label htmlFor="login-code">Sign-in code</label>
        <input
          id="login-code" ref={codeInput} className="code-input" inputMode="numeric" autoComplete="one-time-code"
          placeholder="••••••" maxLength={6} value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 6);
            setCode(v);
            if (v.length === 6 && !busy) verify(v); // sign in as soon as all 6 digits are there
          }}
        />
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="primary-button wide" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
      <div className="otp-links">
        <button type="button" className="text-button" disabled={busy || resendIn > 0} onClick={send}>
          {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
        </button>
        <button type="button" className="text-button" disabled={busy} onClick={() => { setStep('email'); setError(''); }}>Use a different email</button>
      </div>
      <p className="fine">Can’t find it? Check your spam folder. The email comes from S Cube Employee Portal.</p>
    </form>
  );
}

function GoogleButton() {
  const { config, signInGoogle } = usePortal();
  const button = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    loadGsi().then(() => {
      if (cancelled || !button.current) return;
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        hd: config.domain, // only offers accounts on our Workspace domain; the server checks it again
        callback: (res) => signInGoogle(res.credential).catch((e) => setError(e.message)),
      });
      window.google.accounts.id.renderButton(button.current, { theme: 'outline', size: 'large', text: 'continue_with', width: 320 });
    }).catch((e) => setError(e.message));
    return () => { cancelled = true; };
  }, [config, signInGoogle]);
  return <>{<div className="gsi-button" ref={button} />}{error && <p className="field-error">{error}</p>}</>;
}
