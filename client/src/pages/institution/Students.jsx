import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, FileText, Award, QrCode } from 'lucide-react';
import { api, download, useApi } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useT } from '../../lib/i18n.jsx';
import { Badge, Btn, ErrorBox, Modal, PageHead, PageSkeleton, fmtNum, toast } from '../../components/ui.jsx';

export default function Students() {
  const { t } = useT();
  const { user } = useAuth();
  const loc = useLocation();
  const initialQ = new URLSearchParams(loc.search || '').get('q') || '';
  const [q, setQ] = useState(initialQ);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [qr, setQr] = useState(null);

  useEffect(() => {
    const paramQ = new URLSearchParams(loc.search || '').get('q');
    if (paramQ !== null) {
      setQ(paramQ);
      setPage(1);
    }
  }, [loc.search]);

  useEffect(() => {
    if (!selected) {
      setQr(null);
      return;
    }
    api(`/records/${selected.id}/token`)
      .then(setQr)
      .catch(() => setQr(null));
  }, [selected]);

  const { data, error, loading, reload } = useApi(`/students?page=${page}&q=${encodeURIComponent(q)}`);

  return (
    <div className="page">
      <PageHead
        title={t('Students')}
        sub={
          data
            ? `${fmtNum(data.total)} verified APAAR student records · Click any row to generate signed QR & degree certificate`
            : ''
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className="input"
          style={{ paddingLeft: 36 }}
          placeholder="Search by student name or student ID…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          aria-label="Search students"
        />
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : loading && !data ? (
        <PageSkeleton />
      ) : (
        <>
          <div className="tablewrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>APAAR ID</th>
                  {user?.role !== 'institution' && <th>Institution</th>}
                  <th>Programme</th>
                  <th>Year</th>
                  <th>Category</th>
                  <th>Quotas</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((s) => (
                  <tr key={s.id} className="cursor-pointer" onClick={() => setSelected(s)}>
                    <td>
                      <b>{s.name}</b>
                      <div className="muted text-[.76rem] tab-num">ID: {s.student_ref}</div>
                    </td>
                    <td className="tab-num whitespace-nowrap font-semibold text-[var(--brand)]">{s.apaar_id}</td>
                    {user?.role !== 'institution' && <td className="text-xs">{s.institution}</td>}
                    <td>{s.program}</td>
                    <td className="tab-num">{s.admission_year}</td>
                    <td>{s.category}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {s.nri ? <Badge tone="violet">NRI</Badge> : null}
                        {s.oci ? <Badge tone="violet">OCI</Badge> : null}
                        {s.fn ? <Badge tone="violet">FN</Badge> : null}
                        {s.supernumerary ? <Badge tone="info">Supernumerary</Badge> : null}
                        {!s.nri && !s.oci && !s.fn && !s.supernumerary && <span className="muted text-xs">Regular</span>}
                      </div>
                    </td>
                    <td>
                      <Badge tone={s.status === 'ADMITTED' ? 'ok' : s.status === 'GRADUATED' ? 'info' : 'mute'}>
                        {s.status}
                      </Badge>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Btn size="sm" onClick={() => setSelected(s)}>
                        <QrCode size={13} /> Record & QR
                      </Btn>
                    </td>
                  </tr>
                ))}
                {!data.rows.length && (
                  <tr>
                    <td colSpan={9} className="muted text-center">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="muted text-[.84rem] tab-num">
              Page {data.page} of {data.pages || 1} ({fmtNum(data.total)} total)
            </span>
            <div className="flex gap-2">
              <Btn size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Btn>
              <Btn size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                Next
              </Btn>
            </div>
          </div>
        </>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.name} · Verifiable APAAR Record` : ''}
      >
        {selected && (
          <div className="space-y-4">
            <div className="receipt">
              <div className="grid gap-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="muted">APAAR ID (Unique Academic ID)</span>
                  <strong className="tab-num text-[var(--brand)]">{selected.apaar_id}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="muted">Institution Student ID</span>
                  <strong className="tab-num">{selected.student_ref}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="muted">Institution</span>
                  <strong>{selected.institution}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="muted">Programme & Batch</span>
                  <strong>
                    {selected.program} ({selected.admission_year})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="muted">Category & Status</span>
                  <strong>
                    {selected.category} · {selected.status}
                  </strong>
                </div>
              </div>
            </div>

            {qr && (
              <div className="flex items-center gap-4 rounded-xl border border-[var(--line)] p-3 bg-white">
                <img src={qr.qr} alt="Signed Ed25519 QR" width={110} height={110} className="rounded-lg border border-[var(--line)]" />
                <div className="text-xs space-y-1.5">
                  <div className="font-bold text-neutral-900">Tamper-Evident Ed25519 Signed QR</div>
                  <p className="muted">
                    Scanning this QR verifies the record with minimum disclosure. Any alteration to the PDF or token invalidates the signature immediately.
                  </p>
                  <a href={qr.url} target="_blank" rel="noreferrer" className="text-[var(--brand)] font-bold underline block">
                    Open public verification link →
                  </a>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Btn
                variant="primary"
                onClick={() =>
                  download(`/certificates/${selected.id}/pdf`, `praman-certificate-${selected.student_ref}.pdf`).catch((e) =>
                    toast(e.message)
                  )
                }
              >
                <Award size={15} /> Certificate with APAAR + Student ID (PDF)
              </Btn>
              <Btn
                onClick={() =>
                  download(`/records/${selected.id}/pdf`, `praman-record-${selected.student_ref}.pdf`).catch((e) =>
                    toast(e.message)
                  )
                }
              >
                <FileText size={15} /> Signed Record (PDF)
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
