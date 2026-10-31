import { useState } from 'react';
import { api, useApi } from '../../lib/api.js';
import { useT } from '../../lib/i18n.jsx';
import { Badge, Btn, Card, ErrorBox, PageHead, PageSkeleton, fmtDate, toast } from '../../components/ui.jsx';
import { Expand } from '../../components/Expand.jsx';

export default function Inbox() {
  const { t } = useT();
  const { data, error, loading, reload } = useApi('/inbox', { poll: 15000 });
  const [busy, setBusy] = useState(null);

  const respond = async (id, action) => {
    setBusy(id + action);
    try {
      await api(`/handshakes/${id}/respond`, { method: 'POST', body: { action } });
      toast('Handshake response recorded and sent to the other institution');
      reload();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(null);
    }
  };

  const markRead = async () => {
    await api('/notifications/read', { method: 'POST' });
    toast('Notifications marked read');
    reload();
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <div className="page">
      <PageHead
        title={t('Inbox')}
        sub="When one APAAR ID looks active at two institutions, both are quietly asked to confirm. Most cases are a student transfer or withdrawal and resolve here without a formal complaint."
      >
        {data.notifications?.some((n) => !n.read) && (
          <Btn size="sm" onClick={markRead}>
            Mark all notifications read
          </Btn>
        )}
      </PageHead>

      <div className="grid gap-3">
        {data.handshakes.map((h) => (
          <div
            key={h.id}
            className={`overlap ${h.status === 'pending' ? 'RELATED' : h.status === 'disputed' ? 'CONFLICT' : 'SYSTEMIC'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <Badge tone={h.status === 'pending' ? 'warn' : h.status === 'disputed' ? 'danger' : 'ok'}>
                    {h.status.toUpperCase()}
                  </Badge>
                  <span className="muted text-xs tab-num">Handshake #{h.id}</span>
                </div>
                <div className="font-bold text-base">
                  {h.student?.name} · {h.student?.program} ({h.student?.admission_year})
                </div>
                <div className="muted text-[.85rem]">
                  Student ID <strong className="tab-num">{h.student?.student_ref}</strong>. This student’s 12-digit APAAR ID is also enrolled in a full-time programme at another AICTE institution. Opened {fmtDate(h.created_at)}.
                </div>
                {h.resolution && (
                  <div className="notice ok mt-2 text-[.84rem]">
                    <strong>Outcome:</strong> {h.resolution}
                  </div>
                )}
              </div>

              {h.status === 'pending' && (
                <div className="flex flex-wrap gap-2">
                  <Btn size="sm" loading={busy === h.id + 'WITHDRAWN'} onClick={() => respond(h.id, 'WITHDRAWN')}>
                    Student withdrew from us
                  </Btn>
                  <Btn size="sm" loading={busy === h.id + 'TRANSFERRED'} onClick={() => respond(h.id, 'TRANSFERRED')}>
                    Transferred out
                  </Btn>
                  <Btn size="sm" variant="primary" loading={busy === h.id + 'DISPUTE'} onClick={() => respond(h.id, 'DISPUTE')}>
                    Our record is active
                  </Btn>
                </div>
              )}
            </div>

            <Expand title="Match Receipt & Bilateral Soft Handshake Protocol">
              <div className="receipt">
                <ol>
                  <li>
                    <strong>Layer 1 (APAAR Hash Match):</strong> Identical HMAC-SHA256 APAAR digest found across two institutions in academic year {h.student?.admission_year}.
                  </li>
                  <li>
                    <strong>Layer 2 (Zero-Accusation Handshake):</strong> Neither institution is penalised while pending; confirming withdrawal or transfer automatically closes the cross-duplicate flag.
                  </li>
                  <li>
                    <strong>Layer 3 (Audit Attribution):</strong> Your response is cryptographically chained into the AICTE audit log.
                  </li>
                </ol>
              </div>
            </Expand>
          </div>
        ))}
        {!data.handshakes.length && (
          <Card>
            <p className="muted">No duplicate-enrolment checks. Nothing needs your attention.</p>
          </Card>
        )}
      </div>

      <h3 className="mb-3 mt-8 font-bold">Notifications</h3>
      <div className="grid gap-2">
        {data.notifications.map((n) => (
          <div key={n.id} className="tile">
            <div className="flex justify-between gap-2">
              <b className="text-[.9rem]">
                {!n.read && <span className="badge b-info mr-2">New</span>}
                {n.title}
              </b>
              <span className="muted text-[.76rem] whitespace-nowrap tab-num">
                {fmtDate(n.created_at)}
                {n.emailed ? ' · emailed' : ''}
              </span>
            </div>
            <div className="muted text-[.84rem] mt-0.5">{n.body}</div>
          </div>
        ))}
        {!data.notifications.length && <p className="muted">No notifications.</p>}
      </div>
    </div>
  );
}
