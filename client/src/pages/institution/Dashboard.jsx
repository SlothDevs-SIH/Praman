import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, Globe2, Flag, Upload } from 'lucide-react';
import { useApi } from '../../lib/api.js';
import { useT } from '../../lib/i18n.jsx';
import { Badge, Card, ErrorBox, Freshness, Meter, PageHead, PageSkeleton, SEV, Stat, fmtDate, fmtNum } from '../../components/ui.jsx';

export default function Dashboard() {
  const { t } = useT();
  const { data: d, error, loading, reload } = useApi('/dashboard', { poll: 20000 });
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const full = d.headroom.filter((h) => h.headroom <= 0).length;
  return (
    <div className="page">
      <PageHead title={d.institution.name} sub={`${d.institution.district}, ${d.institution.state} · AICTE ID ${d.institution.aicte_id}`}>
        <Freshness date={d.institution.last_upload_at} />
        <Link to="/institution/upload" className="btn btn-hl"><Upload size={16} />{t('Upload data')}</Link>
      </PageHead>

      {d.pendingHandshakes > 0 && (
        <Link to="/institution/inbox" className="mb-4 flex items-center justify-between gap-3 rounded-xl p-3.5 font-semibold" style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}>
          <span>{d.pendingHandshakes} possible duplicate enrolment{d.pendingHandshakes > 1 ? 's' : ''} need your confirmation</span><span>Review →</span>
        </Link>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <Stat icon={Users} label={`Enrolled ${d.year}`} value={fmtNum(d.totals.total)} />
        <Stat icon={Globe2} label="NRI · OCI · FN" value={`${d.totals.nri || 0} · ${d.totals.oci || 0} · ${d.totals.fn || 0}`} sub={`${d.totals.sup || 0} supernumerary`} />
        <Stat icon={Flag} label={t('Open flags')} value={d.flags.length} tone={d.flags.length ? 'danger' : 'ok'} />
        <Stat label="Programmes at capacity" value={full} tone={full ? 'warn' : 'ok'} sub={`of ${d.headroom.length}`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-1 font-bold">{t('Seat headroom')}, {d.year}</h3>
          <p className="muted mb-4 text-[.84rem]">Seats left per approved programme. Uploads that would exceed intake are blocked before they reach AICTE.</p>
          <div className="grid gap-4">{d.headroom.map((h) => <Meter key={h.program_id} label={h.name} used={h.regular_used} cap={h.intake} sub={`Supernumerary seats: ${h.super_used}/${h.super_cap}`} />)}</div>
        </Card>
        <Card>
          <h3 className="mb-3 font-bold">Enrolment by year</h3>
          <div style={{ height: 220 }}><ResponsiveContainer><BarChart data={d.byYear} margin={{ left: -20 }}>
            <CartesianGrid stroke="#e6edfa" vertical={false} /><XAxis dataKey="y" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #d0daef', fontSize: 12 }} /><Bar dataKey="n" name="Students" fill="#1a3fa8" radius={[5, 5, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card><h3 className="mb-3 font-bold">Open flags</h3>
          <div className="grid gap-2">{d.flags.length ? d.flags.map((f) => <div key={f.id} className="tile flex items-start justify-between gap-2"><span className="text-[.88rem] font-semibold">{f.message}</span><Badge tone={SEV[f.severity]}>{f.severity}</Badge></div>) : <p className="muted">All clear.</p>}</div></Card>
        <Card><h3 className="mb-3 font-bold">Recent uploads</h3>
          <div className="grid gap-2 text-[.88rem]">{d.uploads.length ? d.uploads.map((u) => (
            <div key={u.id} className="tile"><div className="flex justify-between gap-2"><b className="truncate">{u.filename}</b><span className="muted whitespace-nowrap">{fmtDate(u.created_at)}</span></div>
              <div className="muted text-[.78rem]">{u.accepted} accepted · {u.autofixed} auto-fixed · {u.rejected} rejected</div></div>)) : <p className="muted">No uploads yet.</p>}</div></Card>
      </div>
    </div>
  );
}
