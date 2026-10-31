import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Logo, LangToggle } from '../components/Shell.jsx';
import { useT } from '../lib/i18n.jsx';
import { useAuth, HOME } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { DotBackdrop } from '../components/DotBackdrop.jsx';
import { AuthPanel } from '../components/AuthPanel.jsx';
import { TextAnimate } from '../components/ui/text-animate.jsx';
import { OrganicButton } from '../components/ui/organic-button.jsx';
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
    t: 'Pre-flight upload autocorrect',
    sum: 'Before rejecting an admission file, Praman repairs formatting errors, normalises categories and catches single-digit APAAR ID typos against the registry.',
    more: [
      'Fixes date formats (3/4/05 → 2005-04-03), trims extra spaces, and maps Gen/GEN/general to GENERAL.',
      'Validates the 12-digit APAAR Verhoeff checksum and suggests the nearest verified registry match.',
      'Nothing is committed until the registrar reviews the receipt and confirms.',
    ],
  },
  {
    t: 'Seat Headroom & intake gate',
    sum: 'Each approved programme displays a live seat headroom bar so institutions see their remaining quota before an over-admission happens.',
    more: [
      'Separates regular approved intake from supernumerary quotas (NRI, OCI and Foreign Nationals).',
      'Uploads that would push regular enrolment past approved intake are flagged at the gate.',
      'Isolation Forest + rule scoring surfaces unusual year-on-year spikes for AICTE review.',
    ],
  },
  {
    t: 'Soft Handshake & minimal disclosure',
    sum: 'Cross-institution duplicate APAAR enrolments trigger a private bilateral check, while employer verifications reveal only the minimum required facts.',
    more: [
      'Both colleges are quietly asked to confirm withdrawal or transfer—resolving most duplicates without a formal dispute.',
      'Employers verifying an APAAR ID or signed Ed25519 QR code never see DOB, category or phone numbers.',
      'Every check is written to the student’s “Who Checked Me?” log and a hash-chained audit trail.',
    ],
  },
];

const COVERS = [
  {
    t: 'Single-window AICTE dashboard',
    tag: 'Overview',
    img: 'dash',
    d: 'Every institution, approved intake, actual enrolment and anomaly flag on one screen.',
    more: [
      'Live counts for total enrolled, approved intake fill rate, NRI/OCI/FN supernumerary seats and open flags.',
      'State-wise intake vs. enrolment comparison and multi-year admission trends.',
      'Institutions ranked by anomaly risk score with plain-language reasons and data-freshness badges.',
    ],
  },
  {
    t: 'Pre-flight autocorrect & headroom',
    tag: 'Prevention',
    img: 'track',
    d: 'Autocorrect messy CSV uploads in one click while watching live course seat headroom.',
    more: [
      'Shows a row-by-row receipt of auto-repaired dates, category spellings and APAAR checksum fixes.',
      'Displays live progress bars per programme (e.g. 118/120 seats used, 2 left) before saving.',
      'Prevents over-admission breaches at the source rather than punishing institutions months later.',
    ],
  },
  {
    t: 'Duplicate Soft Handshake',
    tag: 'Reconciliation',
    img: 'overlap',
    d: 'Silent bilateral resolution when one APAAR ID appears enrolled at two colleges.',
    more: [
      'Detects overlapping full-time enrolments across AICTE-approved institutions automatically.',
      'Notifies both registrars privately to confirm withdrawal, transfer or dispute.',
      'Automatically clears the duplicate flag once either institution confirms transfer or withdrawal.',
    ],
  },
  {
    t: 'Tamper-evident audit & QR',
    tag: 'Security',
    img: 'flow',
    d: 'Hash-chained audit ledger and Ed25519-signed degree certificates with APAAR ID.',
    more: [
      'Every upload, flag resolution, consent change and verification carries the SHA-256 hash of the previous entry.',
      'Auditors can re-verify the entire chain with one click to prove zero tampering.',
      'Generates printable PDF degree certificates printing both APAAR ID and Student ID alongside a signed QR code.',
    ],
  },
  {
    t: 'Minimal-disclosure verification',
    tag: 'Privacy',
    img: 'search',
    d: 'Employers and regulators confirm degrees by APAAR ID or QR without exposing private data.',
    more: [
      'Returns only verified holder name, programme, institution, admission year and graduation status.',
      'Date of birth, category, contact details and NRI status remain hidden from employers by default.',
      'Students control employer/regulator consent switches and see every check in their “Who Checked Me?” log.',
    ],
  },
  {
    t: 'Policy & accreditation reports',
    tag: 'Reporting',
    img: 'report',
    d: 'Exportable state, intake utilisation, over-intake and special-category reports.',
    more: [
      'Ready-made tables for state-wise enrolment, intake utilisation, supernumerary seats and high-risk colleges.',
      'One-click CSV and formatted PDF export for AICTE policy-making and accreditation.',
      'Every report generation is attributed and recorded in the audit trail.',
    ],
  },
];

const EVIDENCE = [
  {
    n: 45,
    of: 45,
    title: 'Cross-college duplicates caught',
    note: 'Every planted duplicate APAAR ID across 60 synthetic institutions was detected and routed to a bilateral Soft Handshake.',
  },
  {
    n: 24,
    of: 25,
    title: 'Messy upload rows auto-repaired',
    note: 'Date slashes, category variants, whitespace and single-digit APAAR typos in the sample CSV are fixed before commit.',
  },
  {
    n: 60,
    of: 60,
    title: 'Institutions scored & hash-chained',
    note: 'All 60 seeded institutions are continuously evaluated for over-intake breaches and anchored in a verifiable SHA-256 audit chain.',
  },
];

export default function Landing() {
  const { t } = useT();
  const { user } = useAuth();
  const nav = useNavigate();
  const [live, setLive] = useState(null);
  const [open, setOpen] = useState(null);
  const [allGone, setAllGone] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    api('/auth/public/live')
      .then(setLive)
      .catch(() => setLive(null));
  }, []);

  return (
    <ExpandableScreen layoutId="cta-card" triggerRadius="100px" contentRadius="24px">
      <div className="land">
        <DotBackdrop />

        <header className="lbar">
          <Logo size={32} />
          <nav aria-label="Page sections">
            <a href="#how">{t('How it works')}</a>
            <a href="#covers">What it covers</a>
            <a href="#evidence">Evidence</a>
            <Link to="/verify">Verify APAAR</Link>
            <Link to={user ? HOME[user.role] : '/login'}>{user ? t('Open the dashboard') : t('Sign in')}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LangToggle />
          </div>
        </header>

        <section className="hero" aria-labelledby="h1">
          <div className="hero-art">
            <SkylineArt />
          </div>
          <div className="hero-copy">
            <p className="eyebrow">AICTE · APAAR ID Student Data Management & Verification · Team SlothDevs</p>
            <h1 id="h1">
              <TextAnimate as="span" animation="blurInUp" by="word" className="inline">
                Verified students,
              </TextAnimate>{' '}
              <mark className="hl">
                <TextAnimate as="span" animation="blurInUp" by="word" delay={0.25} className="inline">
                  honest seats
                </TextAnimate>
              </mark>{' '}
              <TextAnimate as="span" animation="blurInUp" by="word" delay={0.35} className="inline">
                across every college.
              </TextAnimate>
            </h1>
            <TextAnimate as="p" animation="blurInUp" by="line" delay={0.5} className="lead">
              AICTE receives student admissions from approved institutions in different formats. PRAMAN links every enrolment to a 12-digit APAAR ID, repairs upload errors before they are saved, prevents over-admission with live seat headroom meters, and resolves cross-college duplicates quietly.
            </TextAnimate>
            {user ? (
              <OrganicButton
                href={HOME[user.role]}
                size="lg"
                label="Open the dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  nav(HOME[user.role]);
                }}
              />
            ) : (
              <ExpandableScreenTrigger>
                <OrganicButton href="#get-started" size="lg" label="Get started" onClick={(e) => e.preventDefault()} />
              </ExpandableScreenTrigger>
            )}
            <p className="small">
              Our platform doesn’t just catch errors—it prevents them at the source and protects student privacy by default.
            </p>
          </div>

          <div className="floatcard" aria-live="polite">
            {live ? (
              <>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>Cross-Institution APAAR Duplicate – Soft Handshake</strong>
                  <span className="badge b-warn">Pending Check</span>
                </div>
                {live.sample_handshake ? (
                  <>
                    <p style={{ margin: '.5rem 0 .2rem' }}>
                      <strong>{live.sample_handshake.student_name} · {live.sample_handshake.program_name} ({live.sample_handshake.admission_year})</strong>
                    </p>
                    <p className="muted" style={{ margin: 0 }}>
                      Active at {live.sample_handshake.inst_a_name} and {live.sample_handshake.inst_b_name}
                    </p>
                    <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.85rem' }}>
                      Why: same 12-digit APAAR hash enrolled in overlapping full-time programmes · both registrars notified privately.
                    </p>
                  </>
                ) : (
                  <p className="muted">No duplicate handshakes are pending right now.</p>
                )}
                <div className="livestats">
                  <div>
                    <span className="n">
                      <Count to={live.students} />
                    </span>
                    <span className="l">students verified</span>
                  </div>
                  <div>
                    <span className="n">
                      <Count to={live.institutions} />
                    </span>
                    <span className="l">AICTE institutions</span>
                  </div>
                  <div>
                    <span className="n">
                      <Count to={live.open_flags} />
                    </span>
                    <span className="l">open anomaly flags</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="muted">Reading the running repository…</p>
            )}
          </div>
        </section>

        <section className="section" id="how">
          <TextAnimate as="h2" animation="blurInUp" by="word" once>
            How it works
          </TextAnimate>
          <div className="how-box">
            <p className="how-lead">
              Three invisible helpers sit between an institution’s admission file and AICTE’s central repository. Tap a step to open it.
            </p>
            <div className="how-grid">
              {STEPS.map((st, i) => (
                <StepWidget key={st.t} n={i + 1} title={st.t} summary={st.sum} points={st.more} />
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="covers" style={{ paddingTop: 0 }}>
          <TextAnimate as="h2" animation="blurInUp" by="word" once>
            What it covers
          </TextAnimate>
          <div className="cover-wrap">
            <div className="cover-copy">
              <p className="lead">
                Six screens make up the platform. The cards are stacked: <strong>swipe</strong> the top one away to see the next, or <strong>click</strong> it to read what that part does.
              </p>
              <ul className="cover-hints">
                <li>
                  <span aria-hidden="true">↔</span> Swipe left or right to dismiss
                </li>
                <li>
                  <span aria-hidden="true">◉</span> Click to open the details
                </li>
              </ul>
              {allGone && (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setAllGone(false);
                    setRound((r) => r + 1);
                  }}
                >
                  Show the cards again
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
                  onOpen={(a) => setOpen(COVERS.find((c) => c.img === a.href) ?? null)}
                  onEmpty={() => setAllGone(true)}
                  emptyLogo={<MarkDraw />}
                />
              )}
            </div>
          </div>

          <CoverPopup
            open={!!open}
            onClose={() => setOpen(null)}
            title={open?.t ?? ''}
            subtitle={open?.tag ?? ''}
            media={
              open && (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#12306f] via-primary to-[#2459d6] p-5">
                  <div
                    className="w-full overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-white/30"
                    style={{ aspectRatio: '0.72' }}
                  >
                    <img
                      src={`/shots/${open.img}.jpg`}
                      alt={`${open.t}, a screen of the running prototype`}
                      className="block max-w-none"
                      style={{ width: '230%', marginLeft: '-43%' }}
                      referrerPolicy="no-referrer"
                    />
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
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {j + 1}
                    </span>
                    <p className="text-muted-foreground">{m}</p>
                  </div>
                ))}
                <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                  Screen from the running prototype, showing synthetic APAAR records.
                </p>
              </div>
            )}
          </CoverPopup>
        </section>

        <section className="section" id="evidence" style={{ paddingTop: 0 }}>
          <TextAnimate as="h2" animation="blurInUp" by="word" once>
            What we have measured, and what we have not
          </TextAnimate>
          <p className="muted" style={{ maxWidth: '46rem' }}>
            APAAR (via DigiLocker/ABC) and AICTE’s internal admission systems do not expose public APIs, so this prototype runs against a 60-institution synthetic registry with planted over-intake breaches, messy CSV uploads and cross-college duplicate enrolments.
          </p>
          <div className="evi-grid">
            {EVIDENCE.map((e) => (
              <div className="evi" key={e.title}>
                <div className="evi-ringwrap">
                  <Ring pct={e.n / e.of} />
                  <div className="evi-num">
                    <b>
                      <Count to={e.n} />
                    </b>
                    <span>of {e.of}</span>
                  </div>
                </div>
                <h3>{e.title}</h3>
                <p>{e.note}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="lfoot">
          <span>PRAMAN · Team SlothDevs · Smart India Hackathon · AICTE APAAR ID Verification Platform</span>
          <span>
            <Link to="/login">Sign in</Link> · <Link to="/verify">Verify a record</Link> · All student records are synthetic
          </span>
        </footer>

        <ExpandableScreenContent className="xs-content">
          <div className="xs-center">
            <div className="xs-grid">
              <div className="xs-left">
                <TextAnimate as="h2" animation="blurInUp" by="word">
                  Join or sign in to PRAMAN
                </TextAnimate>
                <ul className="xs-points">
                  <li>
                    <span aria-hidden="true">✓</span>
                    Pre-flight CSV autocorrect and live seat headroom meters prevent admission errors before they reach AICTE.
                  </li>
                  <li>
                    <span aria-hidden="true">⇄</span>
                    Bilateral Soft Handshakes resolve cross-institution APAAR duplicates quietly without public accusation.
                  </li>
                  <li>
                    <span aria-hidden="true">☑</span>
                    Minimal-disclosure verification and signed Ed25519 QR certificates protect student privacy by default.
                  </li>
                </ul>
                {live && (
                  <div className="xs-stats">
                    <div>
                      <b>
                        <Count to={live.students} />
                      </b>
                      <span>synthetic students</span>
                    </div>
                    <div>
                      <b>
                        <Count to={live.institutions} />
                      </b>
                      <span>institutions</span>
                    </div>
                    <div>
                      <b>
                        <Count to={live.pending_handshakes} />
                      </b>
                      <span>active handshakes</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="xs-right">
                <AuthPanel />
              </div>
            </div>
          </div>
        </ExpandableScreenContent>
      </div>
    </ExpandableScreen>
  );
}
