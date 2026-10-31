import { useState } from 'react';
import { Sparkles, Check, AlertTriangle, ShieldAlert } from 'lucide-react';
import { api, useApi } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useT } from '../../lib/i18n.jsx';
import { Badge, Btn, Card, ErrorBox, PageHead, PageSkeleton, SEV, fmtDate, toast } from '../../components/ui.jsx';
import { ShiftCard } from '../../components/ui/shift-card.jsx';
import { Expand } from '../../components/Expand.jsx';

const TYPES = [
  ['', 'All open flags'],
  ['OVER_INTAKE', 'Exceeding approved intake'],
  ['CROSS_DUP', 'Cross-institution duplicate'],
  ['ANOMALY', 'Anomaly model alert'],
  ['CATEGORY_MISMATCH', 'Category / supernumerary rule'],
];

const SEVERITY_CLASS = {
  high: 'CONFLICT',
  medium: 'RELATED',
  low: 'SYSTEMIC',
};

export default function Flags() {
  const { t } = useT();
  const { user } = useAuth();
  const [type, setType] = useState('');
  const [ai, setAi] = useState({});
  const [busy, setBusy] = useState(null);
  const { data, error, loading, reload } = useApi(`/flags?status=open${type ? `&type=${type}` : ''}`);

  const explain = async (f) => {
    setBusy(f.id);
    try {
      const r = await api(`/flags/${f.id}/explain`, { method: 'POST' });
      setAi((a) => ({ ...a, [f.id]: r }));
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(null);
    }
  };

  const resolve = async (f) => {
    await api(`/flags/${f.id}/resolve`, { method: 'POST' });
    toast('Flag resolved and written to hash-chained audit log');
    reload();
  };

  const topFlags = (data || []).slice(0, 3);

  return (
    <div className="page">
      <PageHead
        title={t('Flags')}
        sub="Every intake breach, cross-institution APAAR duplicate and Isolation Forest anomaly carries a Match Receipt showing which rules fired."
      />

      {topFlags.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-base font-bold">Priority anomaly spotlight (hover or tap a card to inspect receipt)</h2>
          <div className="sc-grid">
            {topFlags.map((f) => (
              <ShiftCard
                key={`sc-${f.id}`}
                topContent={
                  <div className="flex items-center justify-between gap-2 w-full">
                    <Badge tone={SEV[f.severity]}>{f.severity.toUpperCase()}</Badge>
                    <span className="text-xs font-bold text-[var(--mute)]">{f.type.replace('_', ' ')}</span>
                  </div>
                }
                topAnimateContent={
                  <div className="mt-1 text-[.75rem] text-[var(--brand)] font-semibold truncate">
                    {f.institution || 'AICTE Central Registry'} · {f.year}
                  </div>
                }
                middleContent={
                  <div className="text-center px-2 py-4">
                    <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-full bg-[var(--danger-bg)] text-[var(--danger)]">
                      {f.severity === 'high' ? <ShieldAlert size={22} /> : <AlertTriangle size={22} />}
                    </div>
                    <div className="font-bold text-neutral-900 line-clamp-2">{f.message}</div>
                    <div className="muted text-xs mt-1">{f.institution}</div>
                  </div>
                }
                bottomContent={
                  <div className="text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--brand)]">
                      <span className="sc-dot" /> Match Receipt · Flag #{f.id}
                    </div>
                    <p className="text-[var(--mute)] leading-snug line-clamp-3">
                      {ai[f.id]?.text ||
                        f.ai_explanation ||
                        (f.detail
                          ? Object.entries(f.detail)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')
                          : f.message)}
                    </p>
                    <div className="flex gap-1.5 pt-1">
                      <button
                        type="button"
                        className="btn sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          explain(f);
                        }}
                      >
                        <Sparkles size={12} /> Explain
                      </button>
                      {user.role === 'admin' && (
                        <button
                          type="button"
                          className="btn primary sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            resolve(f);
                          }}
                        >
                          <Check size={12} /> Resolve
                        </button>
                      )}
                    </div>
                  </div>
                }
              />
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 chips">
        {TYPES.map(([v, l]) => (
          <button key={v} className="chip" aria-pressed={type === v} onClick={() => setType(v)}>
            {l}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : loading && !data ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-3">
          {data.map((f) => (
            <div key={f.id} className={`overlap ${SEVERITY_CLASS[f.severity] || 'RELATED'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={SEV[f.severity]}>{f.severity}</Badge>
                    <Badge tone="violet">{f.type.replace('_', ' ')}</Badge>
                    <span className="muted text-xs tab-num">Flag #{f.id}</span>
                  </div>
                  <div className="font-bold text-base">{f.message}</div>
                  <div className="muted text-[.84rem]">
                    <strong>{f.institution || 'National Registry'}</strong> · Academic Year {f.year} · Flagged {fmtDate(f.created_at)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Btn size="sm" loading={busy === f.id} onClick={() => explain(f)}>
                    <Sparkles size={14} /> Plain-language receipt
                  </Btn>
                  {user.role === 'admin' && (
                    <Btn size="sm" variant="primary" onClick={() => resolve(f)}>
                      <Check size={14} /> Mark resolved
                    </Btn>
                  )}
                </div>
              </div>

              {f.detail && (
                <Expand title="Match Receipt & validation rule breakdown">
                  <div className="receipt">
                    <strong>Rules & parameters triggered:</strong>
                    <ol>
                      {Object.entries(f.detail).map(([k, v]) => (
                        <li key={k}>
                          <strong>{k.replace(/_/g, ' ')}:</strong> <span className="tab-num">{String(v)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </Expand>
              )}

              {(ai[f.id] || f.ai_explanation) && (
                <div className="notice mt-3">
                  <strong>Plain-language explanation: </strong>
                  {ai[f.id]?.text || f.ai_explanation}
                  {ai[f.id]?.source && <span className="muted ml-2 text-[.75rem]">({ai[f.id].source})</span>}
                </div>
              )}
            </div>
          ))}
          {!data.length && (
            <Card>
              <p className="muted">No open flags match this filter.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
