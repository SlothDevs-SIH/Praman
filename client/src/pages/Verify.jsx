import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, ShieldX, SearchX, EyeOff } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useT } from '../lib/i18n.jsx';
import { Badge, Btn, Card, PageHead } from '../components/ui.jsx';

export default function Verify() {
  const { t } = useT();
  const { user } = useAuth();
  const loc = useLocation();
  const initialApaar = new URLSearchParams(loc.search || '').get('apaar') || '';
  const [f, setF] = useState({ apaar_id: initialApaar, name: '', purpose: 'Hiring' });
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const paramApaar = new URLSearchParams(loc.search || '').get('apaar');
    if (paramApaar) {
      setF((prev) => ({ ...prev, apaar_id: paramApaar }));
    }
  }, [loc.search]);

  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setErr('');
    setRes(null);
    try {
      setRes(await api('/verify', { method: 'POST', body: f }));
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const r = res?.record;
  const ext = res?.disclosure === 'extended';

  return (
    <div className="page" style={{ maxWidth: 780 }}>
      <PageHead
        title={t('Verify')}
        sub="Confirm a student's enrolment or degree with their 12-digit APAAR ID. You only see what your role needs (Minimal Disclosure), and the student can see that you checked."
      />

      <Card>
        <form onSubmit={submit} className="grid gap-3">
          <div>
            <label className="lbl" htmlFor="ap">
              APAAR ID (12 digits)
            </label>
            <input
              id="ap"
              className="input tab-num"
              inputMode="numeric"
              placeholder="1234 5678 9012"
              required
              value={f.apaar_id}
              onChange={(e) => setF({ ...f, apaar_id: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="lbl" htmlFor="nm">
                Name on the CV (optional, fuzzy-matched without leaking record)
              </label>
              <input id="nm" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>
            <div>
              <label className="lbl" htmlFor="pu">
                Verification Purpose
              </label>
              <select id="pu" className="input" value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}>
                {['Hiring', 'Admission', 'Scholarship', 'Regulatory check', 'Other'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Btn variant="primary" type="submit" loading={busy}>
              {t('Verify')} APAAR Record
            </Btn>
          </div>
        </form>
        {err && (
          <div role="alert" className="notice err mt-3">
            {err}
          </div>
        )}
      </Card>

      {res && (
        <Card
          className="mt-4"
          style={{ animation: 'pop .35s var(--spring) both', borderColor: res.verified ? 'var(--ok)' : 'var(--line)' }}
        >
          {!res.found && (
            <div className="flex items-center gap-3">
              <SearchX size={30} className="muted" />
              <div>
                <b className="text-lg">No matching record</b>
                <p className="muted text-[.88rem]">
                  This APAAR ID is not enrolled at an AICTE-approved institution on Praman, or you are not permitted to see it.
                </p>
              </div>
            </div>
          )}
          {res.found && !res.consent && (
            <div className="flex items-center gap-3">
              <ShieldX size={30} style={{ color: 'var(--warn)' }} />
              <div>
                <b className="text-lg">Consent not given</b>
                <p className="muted text-[.88rem]">{res.message}</p>
              </div>
            </div>
          )}
          {res.verified && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div
                  className="grid h-12 w-12 place-items-center rounded-full"
                  style={{ background: 'var(--ok-bg)', color: 'var(--ok)' }}
                >
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <b className="text-xl">{t('Verified')}</b>
                  <div className="muted text-[.86rem]">
                    Record found and cryptographically confirmed by the AICTE central repository
                  </div>
                </div>
                {res.name_match !== null && (
                  <Badge tone={res.name_match ? 'ok' : 'danger'}>
                    {res.name_match ? 'CV Name matches' : 'CV Name does NOT match'}
                  </Badge>
                )}
              </div>
              <dl className="grid gap-2.5 text-[.92rem]">
                {[
                  ['Holder', r.holder],
                  ['Programme', `${r.programme} (${r.level})`],
                  ['Institution', `${r.institution}, ${r.state}`],
                  ['Admitted', r.admission_year],
                  ['Expected completion', r.expected_completion],
                  ['Status', r.status],
                  ...(ext
                    ? [
                        ['Student ID', r.student_ref],
                        ['Category', r.category],
                        ['NRI / OCI / FN', `${r.nri ? 'Y' : 'N'} / ${r.oci ? 'Y' : 'N'} / ${r.fn ? 'Y' : 'N'}`],
                        ['Supernumerary', r.supernumerary ? 'Yes' : 'No'],
                      ]
                    : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b pb-2" style={{ borderColor: 'var(--line)' }}>
                    <dt className="muted">{k}</dt>
                    <dd className="text-right font-bold tab-num">{v}</dd>
                  </div>
                ))}
              </dl>
              {!ext && (
                <div className="receipt mt-4 flex items-center gap-2 text-[.82rem]">
                  <EyeOff size={16} className="text-[var(--brand)] shrink-0" />
                  <span>
                    <strong>Privacy by Default (Minimal Disclosure):</strong> Date of birth, social category, NRI status and contact details are withheld from {user?.role === 'verifier' ? 'employers' : 'this view'}. This check has been logged to the student’s “Who Checked Me?” audit trail.
                  </span>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
