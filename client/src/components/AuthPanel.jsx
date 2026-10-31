import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, HOME } from '../lib/auth.jsx';
import { OrganicButton } from './ui/organic-button.jsx';

const DEMOS = [
  { role: 'admin', label: 'AICTE Admin', email: 'admin@aicte.demo', pass: 'Admin@123', desc: 'National Overview, Anomaly Flags & Audit' },
  { role: 'institution', label: 'Institution', email: 'institute@demo.edu', pass: 'Inst@123', desc: 'CSV Autocorrect, Headroom & Handshakes' },
  { role: 'verifier', label: 'Employer', email: 'employer@demo.com', pass: 'Emp@123', desc: 'Minimal-Disclosure APAAR Verification' },
  { role: 'regulator', label: 'Regulator', email: 'regulator@demo.gov', pass: 'Reg@123', desc: 'State Quota & Compliance Oversight' },
  { role: 'student', label: 'Student', email: 'student@demo.in', pass: 'Stud@123', desc: 'Signed QR Certificate & Consent Log' },
];

function Pw({ value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <span className="pwrow">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
      />
      <button
        type="button"
        className="pwtoggle"
        onClick={() => setShow((s) => !s)}
        aria-pressed={show}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </span>
  );
}

export function AuthPanel({ from, start = 'in', initialEmail = '' }) {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState(start);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      if (mode === 'in') {
        const u = await login(email, pw);
        nav(from || HOME[u.role] || '/admin', { replace: true });
      } else {
        const u = await register(name, email, pw);
        nav(HOME[u.role] || '/onboarding', { replace: true });
      }
    } catch (x) {
      setErr(x.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const quickLogin = async (d) => {
    setMode('in');
    setEmail(d.email);
    setPw(d.pass);
    setBusy(true);
    setErr('');
    try {
      const u = await login(d.email, d.pass);
      nav(from || HOME[u.role] || '/admin', { replace: true });
    } catch (x) {
      setErr(x.message || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (m) => {
    setMode(m);
    setErr('');
  };

  return (
    <div>
      <div className="auth-tabs" role="tablist" aria-label="Sign in or create an account">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'in'}
          className={mode === 'in' ? 'on' : ''}
          onClick={() => switchTo('in')}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'up'}
          className={mode === 'up' ? 'on' : ''}
          onClick={() => switchTo('up')}
        >
          Create account
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="loginform">
        {mode === 'up' && (
          <label className="f">
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Dr. Rajesh Sharma"
              required
              minLength={2}
            />
          </label>
        )}
        <label className="f">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="institute@demo.edu"
            required
          />
        </label>
        <label className="f">
          Password
          <Pw
            value={pw}
            onChange={setPw}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          />
          {mode === 'up' && <small>At least 6 characters. You will pick your role on the next screen.</small>}
        </label>

        {err && (
          <div className="notice err" role="alert">
            {err}
          </div>
        )}

        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        <div>
          <OrganicButton
            href="#go"
            label={busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
            onClick={(e) => {
              e.preventDefault();
              if (!busy) formRef.current?.requestSubmit();
            }}
          />
        </div>
      </form>

      <p className="muted auth-note">
        {mode === 'in' ? (
          <>
            New here?{' '}
            <button type="button" className="linkbtn" onClick={() => switchTo('up')}>
              Create an account
            </button>
            . You will tell us your role right after.
          </>
        ) : (
          <>
            Already registered?{' '}
            <button type="button" className="linkbtn" onClick={() => switchTo('in')}>
              Sign in
            </button>
            .
          </>
        )}
      </p>

      <div className="mt-4 pt-3 border-t border-[var(--line)]">
        <div className="text-[.74rem] font-bold uppercase tracking-wider text-[var(--mute)] mb-2">
          Instant One-Click Demo Logins
        </div>
        <div className="chips">
          {DEMOS.map((d) => (
            <button
              key={d.email}
              type="button"
              className="chip"
              disabled={busy}
              onClick={() => quickLogin(d)}
              title={d.desc}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
