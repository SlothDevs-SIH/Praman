import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth, HOME } from '../lib/auth.jsx';
import { useT } from '../lib/i18n.jsx';
import { Btn, Card } from '../components/ui.jsx';
import { Logo, LangToggle } from '../components/Shell.jsx';
import { DotBackdrop } from '../components/DotBackdrop.jsx';
import Turnstile from '../components/Turnstile.jsx';

const DEMOS = [
  { role: 'admin', label: 'AICTE Admin', email: 'admin@aicte.demo', password: 'Admin@123', desc: 'Central governance & full audit' },
  { role: 'institution', label: 'Institution', email: 'institute@demo.edu', password: 'Inst@123', desc: 'Batch uploads & headroom meters' },
  { role: 'verifier', label: 'Employer', email: 'employer@demo.com', password: 'Emp@123', desc: 'Minimum disclosure degree checks' },
  { role: 'regulator', label: 'Regulator', email: 'regulator@demo.gov', password: 'Reg@123', desc: 'State-level oversight & quotas' },
  { role: 'student', label: 'Student', email: 'student@demo.in', password: 'Stud@123', desc: 'Personal APAAR credential & consent' },
];

export default function Login() {
  const { user, login } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const initialEmail = params.get('email') || '';

  const [f, setF] = useState({
    email: initialEmail || DEMOS[0].email,
    password: DEMOS.find((d) => d.email === initialEmail)?.password || DEMOS[0].password,
  });
  const [showPw, setShowPw] = useState(false);
  const [activeTab, setActiveTab] = useState(
    DEMOS.find((d) => d.email === initialEmail)?.role || 'admin'
  );
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [siteKey, setSiteKey] = useState(null);
  const [captcha, setCaptcha] = useState(null);
  const onToken = useCallback((tok) => setCaptcha(tok), []);

  useEffect(() => {
    api('/auth/config')
      .then((c) => setSiteKey(c.turnstileSiteKey))
      .catch(() => {});
  }, []);

  if (user) return <Navigate to={HOME[user.role]} replace />;

  const handleSelectRole = (demo) => {
    setActiveTab(demo.role);
    setF({ email: demo.email, password: demo.password });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const u = await login(f.email, f.password, captcha);
      nav(HOME[u.role]);
    } catch (x) {
      setErr(x.message);
      try {
        window.turnstile?.reset();
      } catch {
        /* ignore */
      }
      setCaptcha(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap relative min-h-screen grid place-items-center px-4 py-10 bg-[var(--bg)]">
      <DotBackdrop />

      <div className="w-full max-w-[480px] z-10" style={{ animation: 'rise .5s var(--ease-out) both' }}>
        <div className="mb-6 flex items-center justify-between">
          <Logo size={34} />
          <LangToggle />
        </div>

        <Card className="shadow-2xl border-line" style={{ padding: '1.8rem' }}>
          <div className="mb-4">
            <span className="badge b-info mb-2">Secure Government Portal</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t('Sign in to Praman')}</h1>
            <p className="text-xs text-muted mt-1">
              Automated Permanent Academic Account Registry & Data Verification
            </p>
          </div>

          {/* Role selector tabs */}
          <div className="auth-tabs w-full flex justify-between overflow-x-auto p-1 bg-surface-2 rounded-xl mb-5">
            {DEMOS.map((d) => (
              <button
                key={d.role}
                type="button"
                className={`text-xs py-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === d.role ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'
                }`}
                onClick={() => handleSelectRole(d)}
              >
                {d.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="grid gap-4">
            <div>
              <label className="lbl" htmlFor="em">
                {t('Email address')}
              </label>
              <div className="relative">
                <input
                  id="em"
                  className="input pl-10"
                  type="email"
                  autoComplete="username"
                  required
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              </div>
            </div>

            <div>
              <label className="lbl flex justify-between items-center" htmlFor="pw">
                <span>{t('Password')}</span>
                <span className="text-[.72rem] text-primary font-normal">Pre-filled for hackathon</span>
              </label>
              <div className="relative">
                <input
                  id="pw"
                  className="input pl-10 pr-10"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={f.password}
                  onChange={(e) => setF({ ...f, password: e.target.value })}
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Turnstile siteKey={siteKey} onToken={onToken} />

            {err && (
              <div
                role="alert"
                className="rounded-xl p-3 text-xs font-semibold flex items-center gap-2"
                style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
              >
                <span>⚠</span>
                <span>{err}</span>
              </div>
            )}

            <Btn variant="primary" type="submit" loading={busy} disabled={!!siteKey && !captcha} className="w-full mt-1">
              <span>{t('Sign in to portal')}</span>
              <ArrowRight size={16} />
            </Btn>
          </form>

          <div className="mt-5 pt-4 border-t border-line text-center text-xs text-muted flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Encrypted with AES-256-GCM & SHA-256 HMAC</span>
          </div>
        </Card>

        {/* Demo role fast-switch chips */}
        <div className="mt-4 p-3 rounded-xl bg-surface/80 border border-line backdrop-blur-sm text-center">
          <div className="text-[.75rem] font-bold uppercase tracking-wider text-muted mb-2">
            One-Click Demo Roles
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {DEMOS.map((d) => (
              <button
                key={d.email}
                type="button"
                className={`chip text-xs py-1 px-2.5 ${activeTab === d.role ? 'bg-primary text-white border-primary' : ''}`}
                onClick={() => handleSelectRole(d)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
