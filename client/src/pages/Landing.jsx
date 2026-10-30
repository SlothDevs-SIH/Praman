import { Link } from 'react-router-dom';
import { ArrowRight, Wand2, Gauge, GitMerge, EyeOff, History, BadgeCheck, QrCode, Building2, Upload, ShieldCheck, Database, LineChart, ScanLine } from 'lucide-react';
import { Logo, LangToggle } from '../components/Shell.jsx';
import { useT } from '../lib/i18n.jsx';
import { useAuth, HOME } from '../lib/auth.jsx';

const FLOW = [[Building2, 'Institution'], [Upload, 'Student upload'], [ShieldCheck, 'APAAR validation'], [BadgeCheck, 'Verification'], [Database, 'AICTE repository'], [LineChart, 'Analytics'], [ScanLine, 'Authorised verify']];
const FEATURES = [
  [Wand2, 'Autocorrect on upload', 'Dates, categories and spellings are fixed for you. A one-digit APAAR typo is matched to the closest registered ID. "142 auto-fixed, 6 need you."'],
  [Gauge, 'Seat headroom meter', 'Institutions see seats left per programme before they upload, so over-admission is prevented at the source, not found later.'],
  [GitMerge, 'Duplicate soft handshake', 'If one APAAR ID is active at two institutions, both are quietly asked to confirm. Most cases settle without a complaint.'],
  [EyeOff, 'Minimum disclosure', 'Employers confirm a degree without seeing date of birth, category or contact details. Students are protected by default.'],
  [History, 'Who checked me', 'Every student sees each time their record was verified, by whom and why. The audit trail, shown to the person it concerns.'],
  [QrCode, 'Tamper-evident QR', 'Certificates carry a digitally signed QR. A forged or edited record fails the check in seconds.'],
];

export default function Landing() {
  const { t } = useT();
  const { user } = useAuth();
  return (
    <div>
      <nav className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4 md:px-12">
        <Logo />
        <div className="flex items-center gap-2"><LangToggle />
          <Link to={user ? HOME[user.role] : '/login'} className="btn btn-primary">{user ? t('Open platform') : t('Sign in')}</Link></div>
      </nav>

      <section className="hero">
        <div className="hero-copy" style={{ animation: 'rise .7s var(--ease-out) both' }}>
          <span className="badge b-info mb-4">AICTE · APAAR · Demo build</span>
          <h1 className="text-[clamp(2.2rem,5vw,3.8rem)] font-extrabold leading-[1.05]">
            <span className="hl">{t('Verified students. Honest seats.')}</span>
          </h1>
          <p className="muted mt-5 max-w-xl text-[1.1rem] leading-relaxed">{t('One national student record, linked to APAAR ID, that catches errors before they become violations.')}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/login" className="btn btn-hl">{t('Open platform')} <ArrowRight size={17} /></Link>
            <a href="#how" className="btn">{t('How it works')}</a>
          </div>
        </div>
        <div className="float hidden md:block" aria-hidden="true">
          <div className="card" style={{ padding: '1.4rem', transform: 'rotate(1.5deg)' }}>
            <div className="mb-3 flex items-center justify-between"><b>Upload check</b><span className="badge b-ok">142 auto-fixed</span></div>
            {[['B.Tech Computer Science', 81, 90], ['B.Tech Electronics', 75, 90], ['MBA', 118, 120]].map(([n, u, c]) => (
              <div key={n} className="mb-3">
                <div className="mb-1 flex justify-between text-[.85rem]"><b>{n}</b><span className="muted tab-num">{u}/{c}</span></div>
                <div className="meter"><i style={{ width: `${(u / c) * 100}%`, background: u / c > 0.95 ? 'var(--hl)' : 'var(--ok)' }} /></div>
              </div>
            ))}
            <div className="mt-4 flex items-center gap-2 rounded-lg p-3 text-[.85rem]" style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}><GitMerge size={16} />1 possible duplicate enrolment, both colleges notified</div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-[1280px] px-4 pb-14 md:px-12">
        <h2 className="mb-5 text-2xl font-extrabold">{t('How it works')}</h2>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
          {FLOW.map(([Icon, label], i) => (
            <div key={label} className="tile text-center" style={{ animation: `rise .5s ${i * 0.07}s var(--ease-out) both` }}>
              <Icon className="mx-auto mb-2" size={22} style={{ color: 'var(--brand)' }} /><div className="text-[.88rem] font-bold">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 pb-20 md:px-12">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))' }}>
          {FEATURES.map(([Icon, title, body], i) => (
            <div key={title} className="card" style={{ animation: `rise .5s ${i * 0.06}s var(--ease-out) both` }}>
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl" style={{ background: 'var(--info-bg)', color: 'var(--brand)' }}><Icon size={20} /></div>
              <h3 className="mb-1 font-bold">{title}</h3><p className="muted text-[.92rem] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="muted border-t px-4 py-6 text-center text-[.82rem]" style={{ borderColor: 'var(--line)' }}>Praman · Built for Smart India Hackathon · Demo data is synthetic. No real student information is used.</footer>
    </div>
  );
}
