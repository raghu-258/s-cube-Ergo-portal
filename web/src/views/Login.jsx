import { useEffect, useRef, useState } from 'react';
import { usePortal } from '../portal.jsx';

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
        <div className="orbit o1" /><div className="orbit o2" />
        <div className="brand-lockup light"><div className="brand-mark">S</div><div><div className="brand-name">scube</div><div className="brand-caption">learning portal</div></div></div>
        <div className="login-copy">
          <div className="eyebrow on-dark">For every Scube employee</div>
          <h1>Learn to work with <em>AI</em>, at your own pace.</h1>
          <p>Short video courses made for Scube teams. Your progress saves to your profile, so you can pick up exactly where you left off.</p>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          {otp ? <EmailCodeSignIn domain={domain} /> : <><h2>Sign in</h2><p className="muted">Use your Scube Google Workspace account. No separate password needed.</p></>}
          {google && <>{otp && <div className="or-divider"><span>or</span></div>}<GoogleButton /></>}
          {!google && !otp && <p className="reach-note">Sign-in isn’t set up yet. Add GOOGLE_CLIENT_ID or SMTP settings on the server.</p>}
          <div className="domain-note">Only <b>@{domain}</b> accounts can sign in. Personal Gmail and other accounts are turned away.</div>
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
        <h2>Sign in</h2>
        <p className="muted">Enter your Scube work email. We’ll email you a 6-digit code. No password needed.</p>
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
      <p className="fine">Can’t find it? Check your spam folder. The email comes from Scube Learning Portal.</p>
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
