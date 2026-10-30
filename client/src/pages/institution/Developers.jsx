import { useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { api, useApi } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useT } from '../../lib/i18n.jsx';
import { Btn, Card, PageHead, toast } from '../../components/ui.jsx';

const ENDPOINTS = [
  ['POST', '/api/uploads/preview', 'Validate a CSV or JSON rows without saving'], ['POST', '/api/uploads/commit', 'Validate and save every row that passes'],
  ['POST', '/api/students', 'Create or update one student (JSON body)'], ['GET', '/api/students', 'List your students'], ['GET', '/api/dashboard', 'Seat headroom, flags and upload history'],
  ['POST', '/api/verify', 'Verify a student by APAAR ID'], ['GET', '/api/.well-known/praman-key', 'Public key to check signed records offline'],
];

export default function Developers() {
  const { t } = useT();
  const { user, setUser } = useAuth();
  const [hook, setHook] = useState('');
  const { data: me } = useApi('/auth/me');
  const key = user?.api_key || me?.api_key;
  const origin = window.location.origin;
  const copy = (s) => { navigator.clipboard?.writeText(s); toast('Copied'); };
  const rotate = async () => { const r = await api('/auth/api-key/rotate', { method: 'POST' }); setUser({ ...user, api_key: r.api_key }); toast('New key generated'); };
  const saveHook = async () => { try { await api('/webhook', { method: 'PUT', body: { url: hook } }); toast('Webhook saved'); } catch (e) { toast(e.message); } };
  const curl = `curl -X POST ${origin}/api/uploads/commit \\\n  -H "x-api-key: ${key || 'YOUR_KEY'}" \\\n  -F file=@students.csv`;

  return (
    <div className="page">
      <PageHead title={t('Developers')} sub="Connect your ERP or student information system. Same validation as the web upload, authenticated with an API key." />
      <Card>
        <h3 className="mb-2 font-bold">API key</h3>
        <div className="flex flex-wrap items-center gap-2"><code className="tab-num flex-1 truncate rounded-lg px-3 py-2 text-[.86rem]" style={{ background: 'var(--surface-2)' }}>{key || 'Loading…'}</code>
          <Btn size="sm" onClick={() => copy(key)}><Copy size={14} />Copy</Btn><Btn size="sm" onClick={rotate}><RefreshCw size={14} />Rotate</Btn></div>
        <p className="muted mt-2 text-[.8rem]">Treat this like a password. Rotating it immediately disables the old key.</p>
      </Card>
      <Card className="mt-4"><h3 className="mb-2 font-bold">Example</h3>
        <pre className="overflow-x-auto rounded-lg p-3 text-[.8rem]" style={{ background: '#0f1f3d', color: '#e1ecf9' }}>{curl}</pre></Card>
      <Card className="mt-4"><h3 className="mb-2 font-bold">Webhook</h3>
        <p className="muted mb-2 text-[.84rem]">We POST a signed JSON event (header <code>x-praman-signature</code>) when a duplicate check or flag concerns you. HTTPS only.</p>
        <div className="flex flex-wrap gap-2"><input className="input flex-1" placeholder="https://erp.example.edu/praman-hook" value={hook} onChange={(e) => setHook(e.target.value)} aria-label="Webhook URL" /><Btn variant="primary" onClick={saveHook}>Save</Btn></div></Card>
      <h3 className="mb-3 mt-6 font-bold">Endpoints</h3>
      <div className="tablewrap"><table className="t"><tbody>{ENDPOINTS.map(([m, p, d]) => <tr key={p}><td><span className={`badge ${m === 'GET' ? 'b-info' : 'b-ok'}`}>{m}</span></td><td className="font-mono text-[.82rem]">{p}</td><td className="muted">{d}</td></tr>)}</tbody></table></div>
    </div>
  );
}
