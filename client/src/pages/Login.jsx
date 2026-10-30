import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, HOME } from '../lib/auth.jsx';
import { useT } from '../lib/i18n.jsx';
import { Btn, Card } from '../components/ui.jsx';
import { Logo, LangToggle } from '../components/Shell.jsx';
import Turnstile from '../components/Turnstile.jsx';

const DEMOS = [
  ['AICTE admin', 'admin@aicte.demo', 'Admin@123'], ['Institution', 'institute@demo.edu', 'Inst@123'],
  ['Employer', 'employer@demo.com', 'Emp@123'], ['Regulator', 'regulator@demo.gov', 'Reg@123'], ['Student', 'student@demo.in', 'Stud@123'],
];

export default function Login() {
  const { user, login } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [siteKey, setSiteKey] = useState(null);
  const [captcha, setCaptcha] = useState(null);
  const onToken = useCallback((tok) => setCaptcha(tok), []);

  useEffect(() => { api('/auth/config').then((c) => setSiteKey(c.turnstileSiteKey)).catch(() => {}); }, []);
  if (user) return <Navigate to={HOME[user.role]} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { const u = await login(f.email, f.password, captcha); nav(HOME[u.role]); }
    catch (x) { setErr(x.message); try { window.turnstile?.reset(); } catch { /* ignore */ } setCaptcha(null); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-[440px]" style={{ animation: 'rise .5s var(--ease-out) both' }}>
        <div className="mb-5 flex items-center justify-between"><Logo /><LangToggle /></div>
        <Card style={{ padding: '1.6rem' }}>
          <h1 className="text-2xl font-extrabold">{t('Sign in')}</h1>
          <form onSubmit={submit} className="mt-4 grid gap-3">
            <div><label className="lbl" htmlFor="em">{t('Email')}</label><input id="em" className="input" type="email" autoComplete="username" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><label className="lbl" htmlFor="pw">{t('Password')}</label><input id="pw" className="input" type="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
            <Turnstile siteKey={siteKey} onToken={onToken} />
            {err && <div role="alert" className="rounded-lg p-2.5 text-[.88rem] font-semibold" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{err}</div>}
            <Btn variant="primary" type="submit" loading={busy} disabled={!!siteKey && !captcha}>{t('Sign in')}</Btn>
          </form>
        </Card>
        <Card className="mt-4" style={{ padding: '1rem 1.2rem' }}>
          <div className="mb-2 text-[.78rem] font-bold uppercase tracking-wide muted">Demo accounts (click to fill)</div>
          <div className="flex flex-wrap gap-2">
            {DEMOS.map(([label, email, password]) => <button key={email} type="button" className="chip" onClick={() => setF({ email, password })}>{label}</button>)}
          </div>
        </Card>
      </div>
    </div>
  );
}
