import { useEffect, useState } from 'react';
import { FileText, Award } from 'lucide-react';
import { api, download, useApi } from '../../lib/api.js';
import { useT } from '../../lib/i18n.jsx';
import { Badge, Btn, Card, ErrorBox, PageHead, PageSkeleton, fmtDate, toast } from '../../components/ui.jsx';

const CONSENTS = [['employers', 'Employers', 'Let employers confirm my enrolment or degree'], ['regulators', 'Regulators', 'Let regulators and AICTE verify my record'], ['extended_fields', 'Extended details', 'Share category and admission details with regulators']];

export default function MyRecord() {
  const { t } = useT();
  const { data: d, error, loading, reload } = useApi('/student/me', { poll: 20000 });
  const [qr, setQr] = useState(null);
  const [consent, setConsent] = useState(null);
  const id = d?.record.id;

  useEffect(() => { if (id) api(`/records/${id}/token`).then(setQr).catch(() => {}); }, [id]);
  useEffect(() => { if (d) setConsent(d.consent); }, [d]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const r = d.record;
  const toggle = async (k) => {
    const next = { ...consent, [k]: consent[k] ? 0 : 1 };
    setConsent(next);
    try { await api('/student/consent', { method: 'PUT', body: next }); toast('Consent updated'); } catch (e) { toast(e.message); setConsent(consent); }
  };

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <PageHead title={t('My record')} sub="Your verified academic identity. You decide who can confirm it, and you can see every check." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold">{r.name}</h2><Badge tone="ok">{r.status}</Badge></div>
          <dl className="grid gap-2.5 text-[.92rem]">{[['APAAR ID', r.apaar_id], ['Student ID', r.student_ref], ['Programme', r.program], ['Institution', `${r.institution}, ${r.state}`], ['Admitted', r.admission_year], ['Expected completion', r.admission_year + r.duration]]
            .map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b pb-2" style={{ borderColor: 'var(--line)' }}><dt className="muted">{k}</dt><dd className="tab-num text-right font-bold">{v}</dd></div>)}</dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn onClick={() => download(`/records/${r.id}/pdf`, 'praman-record.pdf').catch((e) => toast(e.message))}><FileText size={15} />Signed record (PDF)</Btn>
            <Btn onClick={() => download(`/certificates/${r.id}/pdf`, 'praman-certificate.pdf').catch((e) => toast(e.message))}><Award size={15} />Certificate with APAAR ID</Btn>
          </div>
        </Card>
        <Card className="text-center">
          <h3 className="mb-2 font-bold">Verification QR</h3>
          {qr ? <img src={qr.qr} alt="Signed verification QR code" width={200} height={200} className="mx-auto" /> : <div className="skeleton mx-auto" style={{ width: 200, height: 200 }} />}
          <p className="muted mt-2 text-[.78rem]">Digitally signed. Anyone who scans it sees only your programme and institution.</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card><h3 className="mb-3 font-bold">{t('Consent')}</h3>
          <div className="grid gap-3">{consent && CONSENTS.map(([k, l, sub]) => (
            <label key={k} className="flex cursor-pointer items-start justify-between gap-3"><span><b className="text-[.92rem]">{l}</b><span className="muted block text-[.8rem]">{sub}</span></span>
              <input type="checkbox" role="switch" className="mt-1 h-5 w-5" checked={!!consent[k]} onChange={() => toggle(k)} /></label>))}</div></Card>
        <Card><h3 className="mb-3 font-bold">{t('Who checked me')}</h3>
          <div className="grid max-h-[320px] gap-2 overflow-y-auto">{d.checks.length ? d.checks.map((c, i) => (
            <div key={i} className="tile"><div className="flex justify-between gap-2"><b className="text-[.88rem]">{c.verifier_name}</b><Badge tone={c.result === 'verified' ? 'ok' : 'warn'}>{c.result.replace('_', ' ')}</Badge></div>
              <div className="muted text-[.78rem]">{c.method === 'QR' ? 'QR scan' : 'APAAR lookup'}{c.purpose ? ` · ${c.purpose}` : ''} · {fmtDate(c.created_at)}</div></div>)) : <p className="muted">No one has checked your record yet.</p>}</div></Card>
      </div>
    </div>
  );
}
