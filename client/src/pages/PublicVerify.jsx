import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { Card, Skeleton, fmtDate } from '../components/ui.jsx';
import { Logo } from '../components/Shell.jsx';

// Public page behind the certificate QR. Shows the minimum needed to confirm authenticity.
export default function PublicVerify() {
  const { token } = useParams();
  const { data, loading, error } = useApi(`/public/verify?token=${encodeURIComponent(token)}`);
  const r = data?.record;
  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-[520px]" style={{ animation: 'rise .5s var(--ease-out) both' }}>
        <div className="mb-5"><Logo /></div>
        {loading ? <Skeleton h={260} /> : error ? <Card>{error}</Card> : (
          <Card style={{ padding: '1.6rem', borderColor: data.authentic ? 'var(--ok)' : 'var(--danger)' }}>
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full" style={{ background: data.authentic ? 'var(--ok-bg)' : 'var(--danger-bg)', color: data.authentic ? 'var(--ok)' : 'var(--danger)', animation: 'pop .4s var(--spring) both' }}>
                {data.authentic ? <ShieldCheck size={26} /> : <ShieldAlert size={26} />}
              </div>
              <div><h1 className="text-xl font-extrabold">{data.authentic ? 'Authentic record' : 'Could not verify'}</h1>
                <p className="muted text-[.88rem]">{data.authentic ? `Digitally signed · issued ${fmtDate(data.issued_at)}` : data.message}</p></div>
            </div>
            {data.authentic && r && (
              <dl className="grid gap-2.5 text-[.92rem]">
                {[['Holder', r.holder], ['Programme', `${r.programme} (${r.level})`], ['Institution', `${r.institution}, ${r.state}`], ['Admitted', r.admission_year], ['Expected completion', r.expected_completion], ['Status', r.status]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b pb-2" style={{ borderColor: 'var(--line)' }}><dt className="muted">{k}</dt><dd className="text-right font-bold">{v}</dd></div>
                ))}
              </dl>
            )}
            {data.notice && <p className="mt-3 rounded-lg p-2.5 text-[.88rem] font-semibold" style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}>{data.notice}</p>}
            <p className="muted mt-4 text-[.78rem]">Only the minimum details are shown. Date of birth, category and contact details are never disclosed here.</p>
          </Card>
        )}
        <p className="muted mt-4 text-center text-[.82rem]"><Link to="/" className="underline">What is Praman?</Link></p>
      </div>
    </div>
  );
}
