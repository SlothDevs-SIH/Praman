import { useState } from 'react';
import { Search } from 'lucide-react';
import { useApi } from '../../lib/api.js';
import { useT } from '../../lib/i18n.jsx';
import { Badge, Btn, ErrorBox, PageHead, PageSkeleton, fmtNum } from '../../components/ui.jsx';

export default function Students() {
  const { t } = useT();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi(`/students?page=${page}&q=${encodeURIComponent(q)}`);
  return (
    <div className="page">
      <PageHead title={t('Students')} sub={data ? `${fmtNum(data.total)} records` : ''} />
      <div className="relative mb-4 max-w-md"><Search size={16} className="muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="input" style={{ paddingLeft: 36 }} placeholder="Search by name or student ID" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search students" /></div>
      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <PageSkeleton /> : (<>
        <div className="tablewrap"><table className="t">
          <thead><tr><th>Student</th><th>APAAR ID</th><th>Programme</th><th>Year</th><th>Category</th><th>Flags</th><th>Status</th></tr></thead>
          <tbody>{data.rows.map((s) => (
            <tr key={s.id}><td><b>{s.name}</b><div className="muted text-[.76rem]">{s.student_ref}</div></td><td className="tab-num whitespace-nowrap">{s.apaar_id}</td><td>{s.program}</td><td className="tab-num">{s.admission_year}</td><td>{s.category}</td>
              <td className="flex flex-wrap gap-1">{s.nri ? <Badge tone="violet">NRI</Badge> : null}{s.oci ? <Badge tone="violet">OCI</Badge> : null}{s.fn ? <Badge tone="violet">FN</Badge> : null}{s.supernumerary ? <Badge tone="info">Super</Badge> : null}</td>
              <td><Badge tone={s.status === 'ADMITTED' ? 'ok' : s.status === 'GRADUATED' ? 'info' : 'mute'}>{s.status}</Badge></td></tr>))}
            {!data.rows.length && <tr><td colSpan={7} className="muted text-center">No students found.</td></tr>}</tbody></table></div>
        <div className="mt-3 flex items-center justify-between"><span className="muted text-[.84rem]">Page {data.page} of {data.pages || 1}</span>
          <div className="flex gap-2"><Btn size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn><Btn size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Btn></div></div>
      </>)}
    </div>
  );
}
