import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApi } from '../../lib/api.js';
import { Badge, Card, ErrorBox, Freshness, Meter, PageHead, PageSkeleton, SEV, fmtDate } from '../../components/ui.jsx';

export default function InstitutionDetail() {
  const { id } = useParams();
  const { data: d, error, loading, reload } = useApi(`/institutions/${id}`);
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div className="page">
      <Link to="/admin/institutions" className="muted mb-3 inline-flex items-center gap-1 text-[.86rem] font-semibold"><ArrowLeft size={15} />All institutions</Link>
      <PageHead title={d.institution.name} sub={`${d.institution.district}, ${d.institution.state} · ${d.institution.aicte_id} · ${d.institution.type}`}>
        <Freshness date={d.institution.last_upload_at} />
      </PageHead>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-bold">Seat headroom, {d.year}</h3>
          <div className="grid gap-4">{d.headroom.map((h) => <Meter key={h.program_id} label={h.name} used={h.regular_used} cap={h.intake} sub={`Supernumerary ${h.super_used}/${h.super_cap}`} />)}</div>
        </Card>
        <Card>
          <h3 className="mb-2 font-bold">Anomaly assessment</h3>
          {d.risk ? (<>
            <Badge tone={d.risk.score > 0.7 ? 'danger' : d.risk.score > 0.6 ? 'warn' : 'ok'}>Risk {(d.risk.score * 100).toFixed(0)} / 100</Badge>
            <ul className="muted mt-3 grid list-disc gap-1.5 pl-5 text-[.88rem]">{d.risk.reasons.length ? d.risk.reasons.map((r) => <li key={r}>{r}</li>) : <li>Pattern is in line with peer institutions.</li>}</ul>
          </>) : <p className="muted">Not scored yet.</p>}
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card><h3 className="mb-3 font-bold">Flags</h3>
          <div className="grid gap-2">{d.flags.length ? d.flags.map((f) => (
            <div key={f.id} className="tile flex items-start justify-between gap-3"><div><div className="text-[.88rem] font-bold">{f.message}</div><div className="muted text-[.76rem]">{f.type} · {fmtDate(f.created_at)}</div></div>
              <div className="flex gap-1"><Badge tone={SEV[f.severity]}>{f.severity}</Badge><Badge tone={f.status === 'open' ? 'warn' : 'ok'}>{f.status}</Badge></div></div>)) : <p className="muted">No flags.</p>}</div></Card>
        <Card><h3 className="mb-3 font-bold">Recent uploads</h3>
          <div className="grid gap-2 text-[.88rem]">{d.uploads.length ? d.uploads.map((u) => <div key={u.id} className="tile flex justify-between gap-2"><span className="truncate">{u.filename}</span><span className="muted tab-num">{u.accepted}/{u.total} · {fmtDate(u.created_at)}</span></div>) : <p className="muted">No uploads yet.</p>}</div></Card>
      </div>
    </div>
  );
}
