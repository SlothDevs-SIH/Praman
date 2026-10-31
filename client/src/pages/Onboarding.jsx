import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth, HOME } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { DotBackdrop } from '../components/DotBackdrop.jsx';
import { OrganicButton } from '../components/ui/organic-button.jsx';
import { TextAnimate } from '../components/ui/text-animate.jsx';

const CARDS = [
  {
    kind: 'institution',
    title: 'An institution representative',
    text: 'Upload student admissions, check course-wise seat headroom meters, and resolve duplicate APAAR enrolments.',
    tag: 'Instant demo access',
    instant: true,
    art: (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path d="M10 26 32 14l22 12H10Z" fill="#dbe6fb" stroke="#1a3fa8" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M16 26v20M26 26v20M38 26v20M48 26v20" stroke="#1a3fa8" strokeWidth="2.5" />
        <rect x="10" y="46" width="44" height="5" rx="1.5" fill="#ff8a2a" stroke="#1a3fa8" strokeWidth="2" />
      </svg>
    ),
  },
  {
    kind: 'verifier',
    title: 'An employer or credential verifier',
    text: 'Verify a candidate’s degree or enrolment by APAAR ID with privacy-preserving minimum disclosure.',
    tag: 'Instant access',
    instant: true,
    art: (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="14" y="10" width="36" height="44" rx="6" fill="#dbe6fb" stroke="#1a3fa8" strokeWidth="2.5" />
        <path d="M22 22h20M22 30h20M22 38h12" stroke="#1a3fa8" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="44" cy="44" r="10" fill="#ff8a2a" stroke="#1a3fa8" strokeWidth="2.5" />
        <path d="m40 44 3 3 5-6" stroke="#0f1f3d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    kind: 'student',
    title: 'An enrolled student or graduate',
    text: 'Inspect your verified APAAR record, download signed QR certificates, and check the “Who Checked Me?” audit log.',
    tag: 'Instant access',
    instant: true,
    art: (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <circle cx="32" cy="22" r="9" fill="#ff8a2a" stroke="#1a3fa8" strokeWidth="2.5" />
        <path d="M16 50c2-10 10-15 16-15s14 5 16 15" fill="#dbe6fb" stroke="#1a3fa8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    kind: 'admin',
    title: 'An AICTE officer or state regulator',
    text: 'Monitor national intake vs. enrolment, inspect anomaly flags, and verify the tamper-evident audit chain.',
    tag: 'Oversight portal',
    instant: true,
    art: (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path d="M32 10 50 18v14c0 12-8 20-18 23-10-3-18-11-18-23V18l18-8Z" fill="#dbe6fb" stroke="#1a3fa8" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="32" cy="31" r="7" fill="#ff8a2a" stroke="#1a3fa8" strokeWidth="2.5" />
      </svg>
    ),
  },
];

function InstitutionPicker({ onPick }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api(`/auth/institutions-list?q=${encodeURIComponent(q)}`)
        .then(setItems)
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <label className="f">
        Find your institution in the AICTE register
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type the college name, city or AICTE ID"
        />
      </label>
      <ul className="pick-list" role="listbox" aria-label="Matching institutions">
        {loading && <li className="muted">Searching…</li>}
        {!loading && items.length === 0 && <li className="muted">No matching institution found.</li>}
        {items.slice(0, 8).map((i) => (
          <li key={i.id}>
            <button type="button" onClick={() => onPick(i)}>
              <strong>{i.name}</strong>
              <span>{[i.district, i.state, i.aicte_id].filter(Boolean).join(' · ')}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Onboarding() {
  const { user, chooseRole, logout } = useAuth();
  const nav = useNavigate();
  const [kind, setKind] = useState(null);
  const [inst, setInst] = useState(null);
  const [staffRole, setStaffRole] = useState('admin');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!user) return <Navigate to="/login" replace />;
  if (user.role && user.role !== 'new') return <Navigate to={HOME[user.role] || '/admin'} replace />;

  const first = user.name?.split(/\s+/)[0] ?? '';
  const ready =
    kind === 'verifier' ||
    kind === 'student' ||
    (kind === 'institution' && !!inst) ||
    (kind === 'admin' && !!staffRole);

  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      const targetRole = kind === 'admin' ? staffRole : kind;
      const updated = await chooseRole(targetRole, inst?.id);
      nav(HOME[updated.role] || '/admin', { replace: true });
    } catch (e) {
      setErr(e.message || 'Could not save role');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pick-wrap">
      <DotBackdrop />
      <button type="button" className="btn sm pick-out" onClick={logout}>
        Sign out
      </button>
      <div className="pick-in">
        <TextAnimate as="h1" animation="blurInUp" by="word">
          {`Welcome${first ? ', ' + first : ''}. Who are you?`}
        </TextAnimate>
        <p className="muted pick-lead">
          Tell us how you will use Praman so we can open the right APAAR verification and compliance workspace for you.
        </p>

        <div className="pick-grid" role="radiogroup" aria-label="Who are you">
          {CARDS.map((c, i) => (
            <motion.button
              key={c.kind}
              type="button"
              role="radio"
              aria-checked={kind === c.kind}
              className={`pick-card ${kind === c.kind ? 'on' : ''}`}
              onClick={() => {
                setKind(c.kind);
                setErr('');
              }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.07, type: 'spring', stiffness: 220, damping: 22 }}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="pick-art">{c.art}</span>
              <strong>{c.title}</strong>
              <span className="pick-text">{c.text}</span>
              <span className={`badge ${c.instant ? 'b-ok' : 'b-warn'}`}>{c.tag}</span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {kind && (
            <motion.div
              key={kind}
              className="card pick-more"
              initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 8 }}
            >
              {kind === 'verifier' && (
                <p style={{ margin: 0 }}>
                  You will land on the APAAR Verification Portal where you can confirm student degrees and enrolment with minimum data disclosure.
                </p>
              )}

              {kind === 'student' && (
                <p style={{ margin: 0 }}>
                  You will land on your personal APAAR Academic Identity portal, linked to a sample student record for interactive testing of consent switches and signed QR certificates.
                </p>
              )}

              {kind === 'institution' && (
                <>
                  {inst ? (
                    <p className="pick-chosen">
                      <span>
                        <strong>{inst.name}</strong>
                        <br />
                        <span className="muted">
                          {[inst.district, inst.state, inst.aicte_id].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <button type="button" className="btn sm" onClick={() => setInst(null)}>
                        Change
                      </button>
                    </p>
                  ) : (
                    <InstitutionPicker onPick={setInst} />
                  )}
                </>
              )}

              {kind === 'admin' && (
                <div className="pick-roles">
                  <button
                    type="button"
                    className={staffRole === 'admin' ? 'on' : ''}
                    aria-pressed={staffRole === 'admin'}
                    onClick={() => setStaffRole('admin')}
                  >
                    <strong>AICTE Administrator</strong>
                    <span>Full national overview, flag resolution, anomaly scanner & audit trail</span>
                  </button>
                  <button
                    type="button"
                    className={staffRole === 'regulator' ? 'on' : ''}
                    aria-pressed={staffRole === 'regulator'}
                    onClick={() => setStaffRole('regulator')}
                  >
                    <strong>State Education Regulator</strong>
                    <span>Read-only oversight of state institutions, masked APAAR records & reports</span>
                  </button>
                </div>
              )}

              {err && (
                <div className="notice err" role="alert" style={{ marginTop: '.8rem' }}>
                  {err}
                </div>
              )}

              <p style={{ margin: '1rem 0 0', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.8rem' }}>
                <OrganicButton
                  href="#continue"
                  label={busy ? 'Saving…' : 'Continue to workspace'}
                  onClick={(e) => {
                    e.preventDefault();
                    if (ready && !busy) submit();
                  }}
                  className={ready ? '' : 'opacity-50'}
                />
                {!ready && (
                  <span className="muted">
                    {kind === 'institution' ? 'Choose your institution first.' : 'Choose your role first.'}
                  </span>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
