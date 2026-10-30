import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, Armchair, Flag, Globe2 } from 'lucide-react';
import { useApi } from '../../lib/api.js';
import { useT } from '../../lib/i18n.jsx';
import { Card, ErrorBox, PageHead, PageSkeleton, Stat, Badge, fmtNum, fmtDate } from '../../components/ui.jsx';

const COLORS = ['#1a3fa8', '#ff8a2a', '#2459d6', '#5b3a9a', '#1d6b3a'];
const tip = { borderRadius: 10, border: '1px solid #d0daef', fontSize: 12 };

export default function Overview() {
  const { t } = useT();
  const { data: d, error, loading, reload } = useApi('/stats/overview', { poll: 15000 });
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const flagTotal = d.flags.reduce((n, f) => n + f.n, 0);
  const over = d.flags.find((f) => f.type === 'OVER_INTAKE')?.n || 0;
  const states = d.byState.slice(0, 10).map((s) => ({ state: s.state, Enrolled: s.enrolled, Intake: s.intake }));

  return (
    <div className="page">
      <PageHead title={t('Overview')} sub={`National admissions for ${d.year}. Updates automatically every 15 seconds.`}>
        <span className="badge b-ok"><span className="pulse-dot" />Live</span>
      </PageHead>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>
        <Stat icon={Users} label={t('Total enrolled')} value={fmtNum(d.kpi.enrolled)} sub={`across ${d.institutions} institutions`} />
        <Stat icon={Armchair} label={t('Approved intake')} value={fmtNum(d.intake)} sub={`${(d.fill * 100).toFixed(1)}% filled`} />
        <Stat icon={Flag} label={t('Open flags')} value={fmtNum(flagTotal)} sub={`${over} over approved intake`} tone={flagTotal ? 'danger' : 'ok'} />
        <Stat icon={Globe2} label="NRI · OCI · FN" value={`${fmtNum(d.kpi.nri)} · ${fmtNum(d.kpi.oci)} · ${fmtNum(d.kpi.fn)}`} sub={`${fmtNum(d.kpi.sup)} supernumerary seats`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-bold">Enrolment by state (top 10)</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer><BarChart data={states} margin={{ left: -10 }}>
              <CartesianGrid stroke="#e6edfa" vertical={false} /><XAxis dataKey="state" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tip} /><Legend />
              <Bar dataKey="Intake" fill="#c9d8ff" radius={[4, 4, 0, 0]} /><Bar dataKey="Enrolled" fill="#1a3fa8" radius={[4, 4, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 font-bold">Category mix</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer><PieChart>
              <Pie data={d.byCategory} dataKey="n" nameKey="c" innerRadius={55} outerRadius={95} paddingAngle={2}>{d.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie>
              <Tooltip contentStyle={tip} /><Legend />
            </PieChart></ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="mb-3 font-bold">Admissions trend</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer><AreaChart data={d.trend} margin={{ left: -15 }}>
              <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a3fa8" stopOpacity={0.35} /><stop offset="1" stopColor="#1a3fa8" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#e6edfa" vertical={false} /><XAxis dataKey="y" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tip} /><Area dataKey="n" name="Students" stroke="#1a3fa8" strokeWidth={2} fill="url(#g)" />
            </AreaChart></ResponsiveContainer>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Institutions needing review</h3><Link to="/admin/institutions" className="text-[.85rem] font-bold" style={{ color: 'var(--brand)' }}>All institutions →</Link></div>
          <div className="grid gap-2">
            {d.topRisk.map((r) => (
              <Link key={r.id} to={`/admin/institutions/${r.id}`} className="tile flex items-start justify-between gap-3">
                <div className="min-w-0"><div className="truncate font-bold">{r.name}</div>
                  <div className="muted text-[.8rem]">{r.state}{r.reasons.length ? ` · ${r.reasons[0]}` : ''}</div></div>
                <Badge tone={r.score > 0.7 ? 'danger' : r.score > 0.6 ? 'warn' : 'info'}>Risk {(r.score * 100).toFixed(0)}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="mb-2 font-bold">Latest activity</h3>
        <ul className="grid gap-1.5 text-[.86rem]">
          {d.feed.map((a, i) => <li key={i} className="flex flex-wrap items-center gap-2"><span className="muted tab-num">{fmtDate(a.ts)}</span><Badge tone="mute">{a.action}</Badge><span>{a.actor_name || a.actor_role}</span><span className="muted">{a.target}</span></li>)}
        </ul>
      </Card>
    </div>
  );
}
