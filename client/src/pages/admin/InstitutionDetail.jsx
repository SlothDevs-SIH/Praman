import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, ShieldAlert, FileCheck2 } from 'lucide-react';
import { useApi } from '../../lib/api.js';
import { Badge, Card, ErrorBox, Freshness, Meter, PageHead, PageSkeleton, SEV, fmtDate, fmtNum } from '../../components/ui.jsx';
import ExpandableProfileCard from '../../components/ui/expandable-profile-card.jsx';

export default function InstitutionDetail() {
  const { id } = useParams();
  const { data: d, error, loading, reload } = useApi(`/institutions/${id}`);
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const totalIntake = d.headroom.reduce((s, h) => s + h.intake, 0);
  const totalUsed = d.headroom.reduce((s, h) => s + h.regular_used, 0);
  const totalSuper = d.headroom.reduce((s, h) => s + h.super_used, 0);

  return (
    <div className="page">
      <Link to="/admin/institutions" className="muted mb-3 inline-flex items-center gap-1 text-[.86rem] font-semibold">
        <ArrowLeft size={15} /> All institutions
      </Link>
      <PageHead
        title={d.institution.name}
        sub={`${d.institution.district}, ${d.institution.state} · AICTE ID ${d.institution.aicte_id} · ${d.institution.type}`}
      >
        <Freshness date={d.institution.last_upload_at} />
      </PageHead>

      <div className="tiles mb-4">
        <div className="tile">
          <div className="n tab-num">{fmtNum(totalUsed)}</div>
          <div className="l">Regular enrolled ({d.year})</div>
        </div>
        <div className="tile">
          <div className="n tab-num">{fmtNum(totalIntake)}</div>
          <div className="l">Approved intake</div>
        </div>
        <div className="tile">
          <div className="n tab-num">{fmtNum(totalSuper)}</div>
          <div className="l">Supernumerary (NRI/OCI/FN)</div>
        </div>
        <div className={`tile ${d.flags.filter((f) => f.status === 'open').length ? 'hot' : ''}`}>
          <div className="n tab-num">{d.flags.filter((f) => f.status === 'open').length}</div>
          <div className="l">Open compliance flags</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-bold">Course-wise Seat Headroom Meter ({d.year})</h3>
          <div className="grid gap-4">
            {d.headroom.map((h) => (
              <Meter
                key={h.program_id}
                label={h.name}
                used={h.regular_used}
                cap={h.intake}
                sub={`Supernumerary quota used: ${h.super_used}/${h.super_cap} · Remaining regular seats: ${Math.max(0, h.headroom)}`}
              />
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4 items-center">
          <ExpandableProfileCard
            title={d.institution.name}
            subtitle={`College 360 Dossier · ${d.institution.aicte_id}`}
            media={
              <div className="h-full w-full bg-gradient-to-br from-[#12306f] via-[#1a3fa8] to-[#2459d6] p-6 flex flex-col justify-between text-white">
                <div className="flex items-center justify-between">
                  <span className="badge b-info bg-white/20 text-white">{d.institution.type}</span>
                  <span className="text-xs font-mono opacity-80">{d.institution.state}</span>
                </div>
                <div className="my-auto flex items-center gap-3">
                  <Building2 size={38} className="text-[#ff8a2a] shrink-0" />
                  <div>
                    <div className="text-2xl font-extrabold tab-num">
                      {d.risk ? `Risk ${(d.risk.score * 100).toFixed(0)}/100` : 'Normal'}
                    </div>
                    <div className="text-xs opacity-80">Click to open full 360° compliance dossier</div>
                  </div>
                </div>
              </div>
            }
            content={
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-neutral-900 mb-1">Institution Identity & Freshness</h4>
                  <p className="text-muted-foreground">
                    <strong>AICTE ID:</strong> {d.institution.aicte_id} · <strong>Location:</strong> {d.institution.district}, {d.institution.state}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    <strong>Last APAAR Batch Upload:</strong> {fmtDate(d.institution.last_upload_at)}
                  </p>
                </div>
                {d.risk && (
                  <div className="receipt">
                    <strong>Isolation Forest & Rule Engine Assessment (Score {(d.risk.score * 100).toFixed(0)} / 100):</strong>
                    <ol>
                      {d.risk.reasons.length ? (
                        d.risk.reasons.map((r) => <li key={r}>{r}</li>)
                      ) : (
                        <li>Admission velocity, NRI share and intake fill rate match peer baselines.</li>
                      )}
                    </ol>
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-neutral-900 mb-1">Approved Programmes ({d.headroom.length})</h4>
                  <ul className="space-y-1 text-xs">
                    {d.headroom.map((h) => (
                      <li key={h.program_id} className="flex justify-between border-b border-[var(--line)] py-1">
                        <span>{h.name}</span>
                        <span className="font-bold tab-num">
                          {h.regular_used}/{h.intake} (+{h.super_used} supernumerary)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            }
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-bold flex items-center gap-2">
            <ShieldAlert size={17} className="text-[var(--brand)]" /> Compliance Flags
          </h3>
          <div className="grid gap-2">
            {d.flags.length ? (
              d.flags.map((f) => (
                <div key={f.id} className="tile flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[.88rem] font-bold">{f.message}</div>
                    <div className="muted text-[.76rem]">
                      {f.type} · {fmtDate(f.created_at)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Badge tone={SEV[f.severity]}>{f.severity}</Badge>
                    <Badge tone={f.status === 'open' ? 'warn' : 'ok'}>{f.status}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No flags recorded for this institution.</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-bold flex items-center gap-2">
            <FileCheck2 size={17} className="text-[var(--brand)]" /> Recent APAAR Batch Uploads
          </h3>
          <div className="grid gap-2 text-[.88rem]">
            {d.uploads.length ? (
              d.uploads.map((u) => (
                <div key={u.id} className="tile flex justify-between gap-2">
                  <div>
                    <b className="truncate block">{u.filename}</b>
                    <span className="muted text-xs">
                      {u.accepted} accepted · {u.autofixed} auto-fixed · {u.rejected} rejected
                    </span>
                  </div>
                  <span className="muted tab-num text-xs whitespace-nowrap">{fmtDate(u.created_at)}</span>
                </div>
              ))
            ) : (
              <p className="muted">No batch uploads recorded yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
