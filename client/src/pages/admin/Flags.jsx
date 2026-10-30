import { useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { api, useApi } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useT } from '../../lib/i18n.jsx';
import { Badge, Btn, Card, ErrorBox, PageHead, PageSkeleton, SEV, fmtDate, toast } from '../../components/ui.jsx';

const TYPES = [['', 'All'], ['OVER_INTAKE', 'Over intake'], ['ANOMALY', 'Anomaly'], ['CROSS_DUP', 'Duplicate enrolment'], ['DATA_QUALITY', 'Data quality']];

export default function Flags() {
  const { t } = useT();
  const { user } = useAuth();
  const [type, setType] = useState('');
  const [ai, setAi] = useState({});
  const [busy, setBusy] = useState(null);
  const { data, error, loading, reload } = useApi(`/flags?status=open${type ? `&type=${type}` : ''}`);

  const explain = async (f) => {
    setBusy(f.id);
    try { const r = await api(`/flags/${f.id}/explain`, { method: 'POST' }); setAi((a) => ({ ...a, [f.id]: r })); }
    catch (e) { toast(e.message); } finally { setBusy(null); }
  };
  const resolve = async (f) => { await api(`/flags/${f.id}/resolve`, { method: 'POST' }); toast('Flag resolved'); reload(); };

  return (
    <div className="page">
      <PageHead title={t('Flags')} sub="Everything the validation engine and anomaly model wants a human to look at. Explanations are generated in plain language." />
      <div className="mb-4 flex flex-wrap gap-2">{TYPES.map(([v, l]) => <button key={v} className="chip" aria-pressed={type === v} onClick={() => setType(v)}>{l}</button>)}</div>
      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <PageSkeleton /> : (
        <div className="grid gap-3">
          {data.map((f) => (
            <Card key={f.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap gap-1.5"><Badge tone={SEV[f.severity]}>{f.severity}</Badge><Badge tone="violet">{f.type.replace('_', ' ')}</Badge></div>
                  <div className="font-bold">{f.message}</div>
                  <div className="muted text-[.8rem]">{f.institution || 'n/a'} · {f.year} · {fmtDate(f.created_at)}</div>
                </div>
                <div className="flex gap-2">
                  <Btn size="sm" loading={busy === f.id} onClick={() => explain(f)}><Sparkles size={14} />Explain</Btn>
                  {user.role === 'admin' && <Btn size="sm" onClick={() => resolve(f)}><Check size={14} />Resolve</Btn>}
                </div>
              </div>
              {(ai[f.id] || f.ai_explanation) && (
                <p className="mt-3 rounded-lg p-3 text-[.88rem] leading-relaxed" style={{ background: 'var(--info-bg)' }}>
                  {ai[f.id]?.text || f.ai_explanation}
                  {ai[f.id]?.source && <span className="muted ml-2 text-[.72rem]">via {ai[f.id].source}</span>}
                </p>
              )}
            </Card>
          ))}
          {!data.length && <Card><p className="muted">Nothing open here. 🎉</p></Card>}
        </div>
      )}
    </div>
  );
}
