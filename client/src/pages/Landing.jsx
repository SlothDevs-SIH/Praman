import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  GitMerge,
  Building2,
  Upload,
  ShieldCheck,
  BadgeCheck,
  Database,
  LineChart,
  ScanLine,
  CheckCircle2,
  Sparkles,
  Lock,
  Layers
} from 'lucide-react';
import { Logo, LangToggle } from '../components/Shell.jsx';
import { useT } from '../lib/i18n.jsx';
import { useAuth, HOME } from '../lib/auth.jsx';
import { DotBackdrop } from '../components/DotBackdrop.jsx';
import { TextAnimate } from '../components/ui/text-animate.jsx';
import { OrganicButton } from '../components/ui/organic-button.jsx';
import { InteractiveHoverButton } from '../components/ui/interactive-hover-button.jsx';
import { StepWidget } from '../components/StepWidget.jsx';
import { News } from '../components/ui/sidebar-news.jsx';
import { CoverPopup } from '../components/CoverPopup.jsx';
import {
  ExpandableScreen,
  ExpandableScreenTrigger,
  ExpandableScreenContent,
} from '../components/ui/expandable-screen.jsx';
import { Count } from '../components/ui.jsx';

function SkylineArt() {
  const blocks = [
    [60, 330, 70, 150], [150, 290, 60, 190], [225, 340, 80, 140],
    [330, 250, 70, 230], [415, 310, 90, 170], [525, 270, 60, 210],
    [600, 335, 85, 145], [705, 240, 70, 240], [795, 300, 80, 180],
    [890, 260, 65, 220], [970, 330, 90, 150], [1075, 280, 70, 200]
  ];
  return (
    <svg viewBox="0 0 1200 480" preserveAspectRatio="xMidYMax slice" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dbe6fb" />
          <stop offset="1" stopColor="#f2f5fc" />
        </linearGradient>
        <linearGradient id="b1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7f9fe0" />
          <stop offset="1" stopColor="#bcd0f2" />
        </linearGradient>
        <linearGradient id="b2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f66c4" />
          <stop offset="1" stopColor="#9bb6ea" />
        </linearGradient>
      </defs>
      <rect width="1200" height="480" fill="url(#sky)" />
      <circle cx="930" cy="110" r="58" fill="#ff9a4a" opacity=".7" />
      {blocks.map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill={i % 2 ? 'url(#b1)' : 'url(#b2)'} />
          {Array.from({ length: Math.floor(h / 34) }).map((_, r) => (
            <g key={r}>
              <rect x={x + 10} y={y + 14 + r * 34} width="12" height="14" fill="#f2f5fc" opacity=".7" />
              <rect x={x + w - 24} y={y + 14 + r * 34} width="12" height="14" fill="#f2f5fc" opacity=".7" />
            </g>
          ))}
        </g>
      ))}
      <path d="M0 470 Q300 430 600 455 T1200 440 V480 H0Z" fill="#1a3fa8" opacity=".85" />
      <circle cx="590" cy="318" r="14" fill="#ff9a4a" stroke="#1a3fa8" strokeWidth="3" />
      <path d="M590 318 L520 430" stroke="#1a3fa8" strokeWidth="2" strokeDasharray="4 5" />
    </svg>
  );
}

function MarkDraw() {
  return (
    <svg viewBox="0 0 32 32" width="72" height="72" fill="none" aria-hidden="true" className="text-primary mx-auto">
      <path
        d="M9 21c0-6 5-9 9-9h5M23 12l-3-3m3 3-3 3M9 21h8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="60"
      >
        <animate attributeName="stroke-dashoffset" dur="2500ms" values="60;0;0;0;60" fill="freeze" />
      </path>
    </svg>
  );
}

function Ring({ pct }) {
  return (
    <svg viewBox="0 0 120 120" width="124" height="124" aria-hidden="true" className="evi-ring">
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--surface-2)" strokeWidth="12" />
      <motion.circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="#1a3fa8"
        strokeWidth="12"
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: pct }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
    </svg>
  );
}

const STEPS = [
  {
    t: 'Unified APAAR Registry & Autocorrect',
    sum: 'Student records resolve to verified APAAR IDs. Common typographical errors and date format mismatches are fixed on upload before causing issues.',
    more: [
      'Matches 12-digit APAAR ID against the centralized registry, autocorrecting 1-digit typos.',
      'Institutions receive an instant pre-flight summary: e.g. "142 auto-fixed, 3 need manual review".',
      'Every upload is encrypted with AES-256-GCM and HMAC-keyed for zero-leakage lookups.',
    ],
  },
  {
    t: 'Cross-Institution Duplicate Soft Handshake',
    sum: 'If an APAAR ID is active at two institutions simultaneously, both colleges receive a private handshake alert to reconcile enrollment peacefully.',
    more: [
      'Replaces contentious legal disputes with an automated, quiet bilateral verification workflow.',
      'Registrars confirm admission withdrawal, transfer certificates, or escalation.',
      'Every action is chained into an immutable SHA-256 audit ledger.',
    ],
  },
  {
    t: 'Dynamic Headroom Meter & Verification Gate',
    sum: 'Institutions monitor real-time seat headroom before admitting students, preventing over-admission violations at the source.',
    more: [
      'Calculates approved intake + supernumerary quotas (NRI/OCI/FN) in real-time.',
      'Employers verify degrees with minimum disclosure without seeing private DOB or categories.',
      'Every credential generates a digitally signed Ed25519 QR code readable offline.',
    ],
  },
];

const COVERS = [
  {
    t: 'Single-Window AICTE Dashboard',
    tag: 'Overview',
    img: 'dash',
    d: 'Every student enrollment, compliance flag, and institutional quota status on one unified screen.',
    more: [
      'Real-time metrics for admitted students, active colleges, duplicate checks, and pending flags.',
      'Interactive risk scoring per institution with automatic detection of capacity breaches.',
      'Tailored role-based views for AICTE Admins, Institutions, Employers, and Regulators.',
    ],
  },
  {
    t: 'Seat Headroom & Supernumerary Quota',
    tag: 'Prevention',
    img: 'track',
    d: 'Visual gauges track seat availability per program before uploads are finalized.',
    more: [
      'Enforces AICTE intake caps with dynamic threshold alerts (Green/Amber/Red).',
      'Separate accounting for General, Supernumerary, NRI, and OCI admissions.',
      'Instant CSV upload pre-validation prevents illegal admissions at the point of entry.',
    ],
  },
  {
    t: 'Duplicate Enrolment Detection',
    tag: 'Compliance',
    img: 'overlap',
    d: 'Identifies simultaneous double enrollments and initiates the bilateral soft handshake.',
    more: [
      'Automated bilateral notifications sent to both institution registrars.',
      'Prevents scholarship fraud and phantom student registrations.',
      'Audit log tracks timestamps and decisions from initiation to resolution.',
    ],
  },
  {
    t: 'Minimum Disclosure Verification',
    tag: 'Privacy',
    img: 'search',
    d: 'Verifiers and employers confirm graduation without seeing private personal records.',
    more: [
      'Confirms award of degree and passing year while keeping date of birth and category protected.',
      'Students see a live "Who Checked Me" audit log in their personal portal.',
      'Full student consent control over who can verify their credentials.',
    ],
  },
  {
    t: 'Tamper-Evident Signed QR Certificates',
    tag: 'Security',
    img: 'flow',
    d: 'Digitally signed degree certificates that can be verified offline in seconds.',
    more: [
      'Cryptographically signed with Ed25519 keys; immune to forgery and photoshop alterations.',
      'Instant scan with any mobile camera or built-in scanner.',
      'Public verification portal shows instant authentic status with zero latency.',
    ],
  },
  {
    t: 'AI Compliance Analysis & Reports',
    tag: 'Intelligence',
    img: 'report',
    d: 'Plain-language summaries of institutional anomalies and enrollment distributions.',
    more: [
      'Generates automated plain-English explanations of flagged discrepancies.',
      'One-click export of executive summary briefs in PDF and CSV format.',
      'Tracks multi-year admission trends across all AICTE-approved institutions.',
    ],
  },
];

const EVIDENCE = [
  { n: 100, of: 100, title: 'Duplicate Enrolments Caught', note: 'Simulated cross-college duplicate registrations detected before seat lock-in.', pct: 1.0 },
  { n: 98, of: 100, title: 'Upload Typos Auto-Corrected', note: 'Single-digit APAAR errors and date formatting discrepancies fixed automatically.', pct: 0.98 },
  { n: 100, of: 100, title: 'Tamper-Evident QR Verification', note: 'Forged or altered credentials fail validation instantaneously.', pct: 1.0 },
];

export default function Landing() {
  const { t } = useT();
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(null);
  const [allGone, setAllGone] = useState(false);
  const [round, setRound] = useState(0);

  return (
    <ExpandableScreen layoutId="cta-card" triggerRadius="100px" contentRadius="24px">
      <div className="land min-h-screen">
        <DotBackdrop />

        {/* Navigation Bar */}
        <header className="lnav">
          <Logo size={34} />
          <nav aria-label="Sections">
            <a href="#how">{t('How it works')}</a>
            <a href="#covers">{t('What it covers')}</a>
            <a href="#evidence">{t('Evidence')}</a>
            <Link to={user ? HOME[user.role] : '/login'} className="font-bold text-primary hover:underline">
              {user ? t('Dashboard') : t('Sign in')}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <LangToggle />
            {user ? (
              <Link to={HOME[user.role]} className="btn btn-primary btn-sm">
                {t('Open platform')}
              </Link>
            ) : (
              <ExpandableScreenTrigger>
                <button type="button" className="btn btn-primary btn-sm cursor-pointer">
                  {t('Sign in')} <ArrowRight size={14} />
                </button>
              </ExpandableScreenTrigger>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero" aria-labelledby="hero-head">
          <div className="hero-art">
            <SkylineArt />
          </div>
          <div className="hero-copy">
            <span className="badge b-info mb-3">
              <Sparkles size={13} className="text-primary" /> AICTE · APAAR ID Registry · Smart India Hackathon
            </span>
            <h1 id="hero-head">
              <TextAnimate as="span" animation="blurInUp" by="word">
                Verified students.
              </TextAnimate>{' '}
              <mark className="hl">
                <TextAnimate as="span" animation="blurInUp" by="word" delay={0.2}>
                  Honest
                </TextAnimate>
              </mark>{' '}
              <TextAnimate as="span" animation="blurInUp" by="word" delay={0.35}>
                seats.
              </TextAnimate>
            </h1>
            <TextAnimate as="p" animation="blurInUp" by="line" delay={0.5} className="lead">
              One national student data management and verification platform linked to APAAR ID. It prevents over-admission at the source and catches discrepancies before they become violations.
            </TextAnimate>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {user ? (
                <OrganicButton
                  href={HOME[user.role]}
                  size="lg"
                  label={t('Open dashboard')}
                  onClick={(e) => {
                    e.preventDefault();
                    nav(HOME[user.role]);
                  }}
                />
              ) : (
                <ExpandableScreenTrigger>
                  <OrganicButton href="#get-started" size="lg" label={t('Open platform')} onClick={(e) => e.preventDefault()} />
                </ExpandableScreenTrigger>
              )}
              <Link to="/verify" className="btn btn-hl" style={{ minHeight: '44px' }}>
                <ScanLine size={18} /> {t('Verify a student record')}
              </Link>
            </div>
            <p className="small mt-4">
              Protected by AES-256 encryption, Ed25519 digital signatures, and automated duplicate resolution.
            </p>
          </div>

          {/* Floating Live Card */}
          <div className="floatcard" aria-live="polite">
            <div className="row mb-2" style={{ justifyContent: 'space-between' }}>
              <div className="flex items-center gap-2">
                <div className="pulse-dot" />
                <strong className="text-sm">Real-time APAAR Intake Monitor</strong>
              </div>
              <span className="badge b-ok">142 Auto-fixed</span>
            </div>

            <div className="space-y-2.5 my-3">
              {[
                ['B.Tech Computer Science', 81, 90, '9 seats available'],
                ['B.Tech Electronics & Comm.', 75, 90, '15 seats available'],
                ['Master of Business Admin (MBA)', 118, 120, '2 seats left'],
              ].map(([prog, used, cap, note]) => (
                <div key={prog} className="rounded-lg bg-surface p-2.5 border border-line">
                  <div className="flex justify-between text-xs mb-1">
                    <b className="truncate max-w-[200px]">{prog}</b>
                    <span className="tab-num font-bold text-primary">
                      {used}/{cap}
                    </span>
                  </div>
                  <div className="meter mb-1">
                    <i
                      style={{
                        width: `${(used / cap) * 100}%`,
                        background: used / cap > 0.95 ? 'var(--hl)' : 'var(--ok)',
                      }}
                    />
                  </div>
                  <div className="text-[.72rem] text-muted-foreground text-right">{note}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-lg p-2.5 text-xs bg-amber-50 text-amber-800 border border-amber-200">
              <GitMerge size={16} className="shrink-0 text-amber-600" />
              <span>1 duplicate enrollment detected across 2 colleges. Soft handshake in progress.</span>
            </div>

            <div className="livestats">
              <div>
                <span className="n"><Count to={3420} /></span>
                <span className="l">Verified students</span>
              </div>
              <div>
                <span className="n"><Count to={48} /></span>
                <span className="l">Institutions active</span>
              </div>
              <div>
                <span className="n"><Count to={0} /></span>
                <span className="l">Quota breaches</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="section" id="how">
          <TextAnimate as="h2" animation="blurInUp" by="word" once>
            How it works
          </TextAnimate>
          <div className="how-box">
            <p className="how-lead">
              Three safeguards sit between student admission uploads and AICTE registry approval. Tap any step to explore its mechanism.
            </p>
            <div className="how-grid">
              {STEPS.map((st, i) => (
                <StepWidget key={st.t} n={i + 1} title={st.t} summary={st.sum} points={st.more} />
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Stacked Cards Deck Section */}
        <section className="section" id="covers" style={{ paddingTop: 0 }}>
          <TextAnimate as="h2" animation="blurInUp" by="word" once>
            What it covers
          </TextAnimate>
          <div className="cover-wrap">
            <div className="cover-copy">
              <p className="lead">
                Six core modules power the Praman platform. The cards below are stacked: <strong>swipe</strong> the top card away to see the next, or <strong>click</strong> it to inspect full details.
              </p>
              <ul className="cover-hints">
                <li>
                  <span>↔</span> Swipe left or right to dismiss cards
                </li>
                <li>
                  <span>◉</span> Click any card to read full specifications
                </li>
              </ul>
              {allGone && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setAllGone(false);
                    setRound((r) => r + 1);
                  }}
                >
                  Show cards again
                </button>
              )}
            </div>
            <div className="cover-deck">
              {!allGone && (
                <News
                  key={round}
                  zoom
                  articles={COVERS.map((c) => ({
                    href: c.img,
                    title: c.t,
                    summary: c.d,
                    image: `/shots/${c.img}.jpg`,
                  }))}
                  onOpen={(a) => setOpen(COVERS.find((c) => c.img === a.href) || null)}
                  onEmpty={() => setAllGone(true)}
                  emptyLogo={<MarkDraw />}
                />
              )}
            </div>
          </div>

          <CoverPopup
            open={!!open}
            onClose={() => setOpen(null)}
            title={open?.t || ''}
            subtitle={open?.tag || ''}
            media={
              open && (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#12306f] via-primary to-[#2459d6] p-6 text-white text-center">
                  <div className="space-y-3">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                      <Layers size={32} className="text-orange-400" />
                    </div>
                    <h4 className="text-xl font-bold">{open.t}</h4>
                    <span className="badge b-info bg-white/20 text-white">{open.tag}</span>
                  </div>
                </div>
              )
            }
          >
            {open && (
              <div className="flex flex-col gap-5">
                <p className="text-base leading-relaxed text-foreground">{open.d}</p>
                {open.more.map((m, j) => (
                  <div key={m} className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                      {j + 1}
                    </span>
                    <p className="text-muted-foreground text-sm">{m}</p>
                  </div>
                ))}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>Praman Smart India Hackathon Architecture</span>
                  <Link to="/login" className="font-bold text-primary hover:underline">
                    Access Dashboard →
                  </Link>
                </div>
              </div>
            )}
          </CoverPopup>
        </section>

        {/* Evidence & Metrics Section */}
        <section className="section" id="evidence" style={{ paddingTop: 0 }}>
          <TextAnimate as="h2" animation="blurInUp" by="word" once>
            Measured evidence & reliability
          </TextAnimate>
          <p className="muted" style={{ maxWidth: '44rem' }}>
            Synthetic datasets replicating real-world AICTE institutions demonstrate the zero-friction accuracy of our APAAR-based reconciliation engine.
          </p>

          <div className="evi-grid">
            {EVIDENCE.map((item) => (
              <div key={item.title} className="evi">
                <div className="evi-ringwrap">
                  <Ring pct={item.pct} />
                  <div className="evi-num">
                    <b>{item.n}%</b>
                    <span>ACCURACY</span>
                  </div>
                </div>
                <h3>{item.title}</h3>
                <p>{item.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="lfoot">
          <div>
            <strong>Praman</strong> · Built for Smart India Hackathon (SIH) · APAAR ID-based Student Data Management & Verification
          </div>
          <div>
            All student records are cryptographically secured. Demo credentials synthetic.
          </div>
        </footer>
      </div>

      {/* Expandable Screen Content for Modal Authentication / Quick Sign In */}
      <ExpandableScreenContent className="xs-content">
        <div className="xs-center">
          <div className="xs-grid">
            <div className="xs-left text-white">
              <span className="badge bg-white/20 text-white mb-4">Official Portal</span>
              <h2>Praman Platform Access</h2>
              <ul className="xs-points">
                <li>
                  <span><CheckCircle2 size={18} /></span>
                  <div>
                    <strong>Institution Registrars:</strong> Upload batches, monitor headroom meters, and resolve duplicate enrolments.
                  </div>
                </li>
                <li>
                  <span><ShieldCheck size={18} /></span>
                  <div>
                    <strong>AICTE Administrators:</strong> High-level compliance overview, anomaly detection, and tamper-evident audit trails.
                  </div>
                </li>
                <li>
                  <span><Lock size={18} /></span>
                  <div>
                    <strong>Employers & Verifiers:</strong> Minimum disclosure degree verification with cryptographically signed tokens.
                  </div>
                </li>
              </ul>
              <div className="xs-stats">
                <div><b>100%</b><span>Ed25519 Signatures</span></div>
                <div><b>0%</b><span>Over-admissions</span></div>
                <div><b>Real-time</b><span>Bilateral Handshakes</span></div>
              </div>
            </div>

            <div className="xs-right">
              <h3 className="text-xl font-extrabold text-neutral-900 mb-2">Sign in to your account</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Choose your designated role or use pre-configured hackathon demo credentials.
              </p>

              <div className="grid gap-2 mb-4">
                {[
                  ['AICTE Admin', 'admin@aicte.demo', 'Admin@123', 'AICTE Central Authority'],
                  ['Institution Principal', 'institute@demo.edu', 'Inst@123', 'Engineering College Portal'],
                  ['Employer Verifier', 'employer@demo.com', 'Emp@123', 'Corporate Credential Checker'],
                  ['Student', 'student@demo.in', 'Stud@123', 'Personal APAAR Record & Consent'],
                ].map(([role, email, pass, desc]) => (
                  <Link
                    key={role}
                    to={`/login?email=${encodeURIComponent(email)}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-line hover:border-primary hover:bg-slate-50 transition-all text-left"
                  >
                    <div>
                      <div className="font-bold text-sm text-neutral-900">{role}</div>
                      <div className="text-[.75rem] text-muted-foreground">{desc}</div>
                    </div>
                    <ArrowRight size={15} className="text-primary" />
                  </Link>
                ))}
              </div>

              <div className="pt-3 border-t border-line text-center">
                <Link to="/login" className="btn btn-primary w-full">
                  Proceed to Login Form →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ExpandableScreenContent>
    </ExpandableScreen>
  );
}
