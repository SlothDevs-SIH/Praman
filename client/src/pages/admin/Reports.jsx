import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { download, useApi } from '../../lib/api.js';
import { useT } from '../../lib/i18n.jsx';
import { Btn, Card, ErrorBox, PageHead, PageSkeleton, toast } from '../../components/ui.jsx';

export default function Reports() {
  const { t } = useT();
  const { data: list, error, loading, reload } = useApi('/reports');
  const [sel, setSel] = useState('enrolment-by-state');
  const { data: rep } = useApi(`/reports/${sel}`);
  const get = (fmt) => download(`/reports/${sel}?format=${fmt}`, `${sel}.${fmt}`).catch((e) => toast(e.message));

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div className="page">
      <PageHead title={t('Reports')} sub="Ready-made reports for policy, accreditation and monitoring. Every export is written to the audit trail.">
        <Btn onClick={() => get('csv')}><Download size={15} />CSV</Btn><Btn variant="primary" onClick={() => get('pdf')}><FileText size={15} />PDF</Btn>
      </PageHead>
      <div className="mb-4 flex flex-wrap gap-2">{list.map((r) => <button key={r.id} className="chip" aria-pressed={sel === r.id} onClick={() => setSel(r.id)}>{r.title}</button>)}</div>
      <Card>
        {!rep ? <div className="skeleton" style={{ height: 240 }} /> : (<>
          <h3 className="mb-1 font-bold">{rep.title} <span className="muted font-normal">· {rep.year}</span></h3>
          <div className="tablewrap mt-3" style={{ maxHeight: 520 }}>
            <table className="t"><thead><tr>{rep.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{rep.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={typeof c === 'number' ? 'tab-num' : ''}>{c}</td>)}</tr>)}
                {!rep.rows.length && <tr><td colSpan={rep.cols.length} className="muted text-center">No rows.</td></tr>}</tbody></table>
          </div>
        </>)}
      </Card>
    </div>
  );
}
