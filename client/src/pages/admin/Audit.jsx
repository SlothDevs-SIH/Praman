import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { useApi } from '../../lib/api.js';
import { useT } from '../../lib/i18n.jsx';
import { Badge, ErrorBox, PageHead, PageSkeleton, fmtDate } from '../../components/ui.jsx';

export default function Audit() {
  const { t } = useT();
  const { data, error, loading, reload } = useApi('/audit?limit=150', { poll: 20000 });
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div className="page">
      <PageHead title={t('Audit trail')} sub="Every login, upload, verification and export. Each entry is chained to the one before it, so any edit to history is detectable.">
        <span className={`badge ${data.chain.ok ? 'b-ok' : 'b-danger'}`}>{data.chain.ok ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}{data.chain.ok ? `Chain intact · ${data.chain.total} entries` : `Chain broken at #${data.chain.brokenAt}`}</span>
      </PageHead>
      <div className="tablewrap"><table className="t">
        <thead><tr><th>#</th><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Hash</th></tr></thead>
        <tbody>{data.rows.map((r) => (
          <tr key={r.id}><td className="tab-num">{r.id}</td><td className="tab-num whitespace-nowrap">{fmtDate(r.ts)}</td><td>{r.actor_name || '–'}<div className="muted text-[.74rem]">{r.actor_role}</div></td>
            <td><Badge tone="info">{r.action}</Badge></td><td className="muted">{r.target}</td><td className="muted font-mono text-[.72rem]">{r.hash.slice(0, 12)}…</td></tr>))}</tbody>
      </table></div>
    </div>
  );
}
