import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApi } from '../../lib/api.js';
import { useT } from '../../lib/i18n.jsx';
import { Badge, ErrorBox, Freshness, PageHead, PageSkeleton, fmtNum } from '../../components/ui.jsx';

export default function Institutions() {
  const { t } = useT();
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useApi(`/institutions?q=${encodeURIComponent(q)}`);
  return (
    <div className="page">
      <PageHead title={t('Institutions')} sub="Sorted by anomaly risk. Open one to see seat headroom, flags and uploads." />
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="input" style={{ paddingLeft: 36 }} placeholder="Search by name or state" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search institutions" />
      </div>
      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <PageSkeleton /> : (
        <div className="tablewrap">
          <table className="t">
            <thead><tr><th>Institution</th><th>State</th><th>Intake</th><th>Enrolled</th><th style={{ width: 160 }}>Fill</th><th>Data</th><th>Flags</th><th>Risk</th></tr></thead>
            <tbody>
              {data.rows.map((r) => {
                const fill = r.intake ? (r.enrolled / r.intake) * 100 : 0;
                return (
                  <tr key={r.id}>
                    <td><Link to={`/admin/institutions/${r.id}`} className="font-bold underline-offset-2 hover:underline">{r.name}</Link><div className="muted text-[.76rem]">{r.aicte_id} · {r.type}</div></td>
                    <td>{r.state}</td><td className="tab-num">{fmtNum(r.intake)}</td><td className="tab-num">{fmtNum(r.enrolled)}</td>
                    <td><div className="meter"><i style={{ width: `${Math.min(fill, 100)}%`, background: fill > 100 ? 'var(--danger)' : fill > 95 ? 'var(--hl)' : 'var(--brand-2)' }} /></div><span className="tab-num muted text-[.76rem]">{fill.toFixed(0)}%</span></td>
                    <td><Freshness date={r.last_upload_at} /></td>
                    <td>{r.open_flags ? <Badge tone="warn">{r.open_flags} open</Badge> : <Badge tone="ok">Clear</Badge>}</td>
                    <td>{r.risk != null ? <Badge tone={r.risk > 0.7 ? 'danger' : r.risk > 0.6 ? 'warn' : 'mute'}>{(r.risk * 100).toFixed(0)}</Badge> : '–'}</td>
                  </tr>
                );
              })}
              {!data.rows.length && <tr><td colSpan={8} className="muted text-center">No institutions match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
