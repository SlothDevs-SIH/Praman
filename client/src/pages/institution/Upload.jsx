import { useRef, useState } from 'react';
import { UploadCloud, Wand2, CheckCircle2, XCircle, AlertTriangle, FileDown } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useT } from '../../lib/i18n.jsx';
import { Badge, Btn, Card, Meter, PageHead, toast } from '../../components/ui.jsx';

const TONE = { ok: 'ok', fixed: 'info', warning: 'warn', error: 'danger' };

export default function UploadPage() {
  const { t } = useT();
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [filter, setFilter] = useState('attention');
  const [drag, setDrag] = useState(false);
  const input = useRef();

  const send = async (path, f) => {
    const form = new FormData();
    form.append('file', f);
    return api(path, { method: 'POST', form });
  };
  const pick = async (f) => {
    if (!f) return;
    setFile(f); setRes(null); setDone(null); setBusy(true);
    try { setRes(await send('/uploads/preview', f)); } catch (e) { toast(e.message); } finally { setBusy(false); }
  };
  const commit = async () => {
    setBusy(true);
    try { const r = await send('/uploads/commit', file); setDone(r); toast(`${r.accepted} records saved`); } catch (e) { toast(e.message); } finally { setBusy(false); }
  };

  const s = res?.summary;
  const rows = res?.rows.filter((r) => (filter === 'all' ? true : filter === 'attention' ? r.status !== 'ok' && r.status !== 'fixed' : r.status === filter)) || [];
  const touched = res?.headroom.filter((h) => h.regular_used > 0 || h.super_used > 0) || [];

  return (
    <div className="page">
      <PageHead title={t('Upload data')} sub="Drop a CSV. We check it against the APAAR registry and your approved intake, fix what we safely can, and show you the rest before anything is saved.">
        <a href="/sample-upload.csv" download className="btn"><FileDown size={15} />Sample file</a>
      </PageHead>

      <div role="button" tabIndex={0} className="card grid cursor-pointer place-items-center text-center" style={{ padding: '2.2rem 1rem', borderStyle: 'dashed', borderColor: drag ? 'var(--brand)' : 'var(--line)', background: drag ? 'var(--info-bg)' : undefined }}
        onClick={() => input.current.click()} onKeyDown={(e) => e.key === 'Enter' && input.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}>
        <UploadCloud size={34} style={{ color: 'var(--brand)' }} />
        <div className="mt-2 font-bold">{file ? file.name : 'Drag a CSV here, or click to choose'}</div>
        <div className="muted text-[.84rem]">Columns: apaar_id, student_id, name, dob, gender, category, nri, oci, fn, supernumerary, program, admission_year</div>
        <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => pick(e.target.files[0])} />
      </div>

      {busy && !res && <div className="skeleton mt-4" style={{ height: 160 }} />}

      {res && (<div style={{ animation: 'rise .4s var(--ease-out) both' }}>
        <Card className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3"><Wand2 style={{ color: 'var(--brand)' }} />
              <div><div className="text-lg font-extrabold">{s.fixed + s.warning} of {s.total} rows auto-corrected, {s.error} need your attention</div>
                <div className="muted text-[.86rem]">{s.autofixes} small fixes applied (dates, spellings, categories, APAAR typos). Nothing is saved until you confirm.</div></div></div>
            {done ? <Badge tone="ok"><CheckCircle2 size={14} />Saved {done.accepted} · {done.handshakes} duplicate check{done.handshakes === 1 ? '' : 's'} sent</Badge>
              : <Btn variant="primary" loading={busy} onClick={commit} disabled={s.total - s.error === 0}>Save {s.total - s.error} valid record{s.total - s.error === 1 ? '' : 's'}</Btn>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[['attention', `Needs attention (${s.error + s.warning})`], ['fixed', `Auto-fixed (${s.fixed})`], ['all', `All (${s.total})`]].map(([v, l]) => <button key={v} className="chip" aria-pressed={filter === v} onClick={() => setFilter(v)}>{l}</button>)}
          </div>
        </Card>

        {touched.length > 0 && (
          <Card className="mt-4"><h3 className="mb-3 font-bold">Seat headroom after this file</h3>
            <div className="grid gap-4 md:grid-cols-2">{touched.map((h) => <Meter key={`${h.program_id}${h.year}`} label={`${h.name} (${h.year})`} used={h.regular_used} cap={h.intake} />)}</div></Card>
        )}

        <div className="tablewrap mt-4"><table className="t">
          <thead><tr><th>Row</th><th>Status</th><th>Student</th><th>APAAR</th><th>What we did / what is wrong</th></tr></thead>
          <tbody>
            {rows.slice(0, 200).map((r) => (
              <tr key={r.line}>
                <td className="tab-num">{r.line}</td>
                <td><Badge tone={TONE[r.status]}>{r.status === 'error' ? <XCircle size={13} /> : r.status === 'warning' ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}{r.status}</Badge></td>
                <td><b>{r.name || '–'}</b><div className="muted text-[.76rem]">{r.student_ref}</div></td>
                <td className="tab-num whitespace-nowrap">{r.apaar_id || '–'}</td>
                <td>
                  {r.issues.map((i, k) => <div key={k} className="font-semibold" style={{ color: i.severity === 'error' ? 'var(--danger)' : 'var(--warn)' }}>{i.message}</div>)}
                  {r.fixes.map((f, k) => <div key={k} className="muted text-[.8rem]"><b>{f.field}</b>: “{String(f.from)}” → “{String(f.to)}” <span className="opacity-70">({f.why})</span></div>)}
                </td>
              </tr>))}
            {!rows.length && <tr><td colSpan={5} className="muted text-center">Nothing in this view.</td></tr>}
          </tbody></table></div>
      </div>)}
    </div>
  );
}
