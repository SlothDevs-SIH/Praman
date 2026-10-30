import { useState } from 'react';
import { api, useApi } from '../../lib/api.js';
import { useT } from '../../lib/i18n.jsx';
import { Badge, Btn, Card, ErrorBox, PageHead, PageSkeleton, fmtDate, toast } from '../../components/ui.jsx';

export default function InboxPage() {
  const { t } = useT();
  const { data, error, loading, reload } = useApi('/inbox');
  const [busy, setBusy] = useState(null);
  const respond = async (id, action) => {
    setBusy(id + action);
    try { await api(`/handshakes/${id}/respond`, { method: 'POST', body: { action } }); toast('Response recorded'); reload(); }
    catch (e) { toast(e.message); } finally { setBusy(null); }
  };
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div className="page">
      <PageHead title={t('Inbox')} sub="When one APAAR ID looks active at two institutions, both are asked to confirm. Most cases are a transfer or a stale record and close here, with no formal complaint." />
      <div className="grid gap-3">
        {data.handshakes.map((h) => (
          <Card key={h.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="mb-1"><Badge tone={h.status === 'pending' ? 'warn' : h.status === 'disputed' ? 'danger' : 'ok'}>{h.status}</Badge></div>
                <div className="font-bold">{h.student.name} · {h.student.program} ({h.student.admission_year})</div>
                <div className="muted text-[.84rem]">Student ID {h.student.student_ref}. This APAAR ID is also active at another institution. Opened {fmtDate(h.created_at)}.</div>
                {h.resolution && <div className="muted mt-1 text-[.8rem]">Outcome: {h.resolution}</div>}</div>
              {h.status === 'pending' && <div className="flex flex-wrap gap-2">
                <Btn size="sm" loading={busy === h.id + 'WITHDRAWN'} onClick={() => respond(h.id, 'WITHDRAWN')}>Student withdrew from us</Btn>
                <Btn size="sm" loading={busy === h.id + 'TRANSFERRED'} onClick={() => respond(h.id, 'TRANSFERRED')}>Transferred out</Btn>
                <Btn size="sm" loading={busy === h.id + 'DISPUTE'} onClick={() => respond(h.id, 'DISPUTE')}>Our record is correct</Btn></div>}
            </div>
          </Card>))}
        {!data.handshakes.length && <Card><p className="muted">No duplicate-enrolment checks. Nothing needs your attention.</p></Card>}
      </div>
      <h3 className="mb-3 mt-8 font-bold">Notifications</h3>
      <div className="grid gap-2">{data.notifications.map((n) => <div key={n.id} className="tile"><div className="flex justify-between gap-2"><b className="text-[.9rem]">{n.title}</b><span className="muted text-[.76rem] whitespace-nowrap">{fmtDate(n.created_at)}{n.emailed ? ' · emailed' : ''}</span></div><div className="muted text-[.84rem]">{n.body}</div></div>)}
        {!data.notifications.length && <p className="muted">No notifications.</p>}</div>
    </div>
  );
}
