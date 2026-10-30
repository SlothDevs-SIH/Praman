import { useEffect, useState, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';

export const Card = ({ className = '', children, ...p }) => <div className={`card ${className}`} {...p}>{children}</div>;

export const Badge = ({ tone = 'mute', children }) => <span className={`badge b-${tone}`}>{children}</span>;

export function Btn({ variant, size, loading, className = '', children, ...p }) {
  const cls = ['btn', variant === 'primary' && 'btn-primary', variant === 'hl' && 'btn-hl', variant === 'ghost' && 'btn-ghost', size === 'sm' && 'btn-sm', className].filter(Boolean).join(' ');
  return <button className={cls} disabled={loading || p.disabled} {...p}>{loading && <Loader2 size={16} className="animate-spin" />}{children}</button>;
}

export const Skeleton = ({ h = 20, w = '100%', className = '' }) => <div className={`skeleton ${className}`} style={{ height: h, width: w }} />;

export const PageSkeleton = () => (
  <div className="page grid gap-4">
    <Skeleton h={34} w="40%" />
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={92} />)}</div>
    <Skeleton h={280} />
  </div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <Card className="m-6" style={{ borderColor: 'var(--danger)' }}>
    <b style={{ color: 'var(--danger)' }}>Something went wrong</b>
    <p className="muted mt-1">{message}</p>
    {onRetry && <Btn className="mt-3" onClick={onRetry}>Try again</Btn>}
  </Card>
);

export function Stat({ label, value, sub, tone, icon: Icon }) {
  return (
    <div className="tile">
      <div className="flex items-center justify-between gap-2">
        <span className="muted text-[.78rem] font-bold uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={18} className="muted" />}
      </div>
      <div className="tab-num mt-1 text-[1.7rem] font-extrabold leading-tight" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</div>
      {sub && <div className="muted mt-0.5 text-[.8rem]">{sub}</div>}
    </div>
  );
}

export const PageHead = ({ title, sub, children }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-[1.6rem] font-extrabold">{title}</h1>
      {sub && <p className="muted mt-1 max-w-2xl">{sub}</p>}
    </div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

// Seat Headroom Meter: green while there is room, amber when nearly full, red when full or breached.
export function Meter({ used, cap, label, sub }) {
  const pct = cap ? (used / cap) * 100 : 0;
  const color = pct > 100 ? 'var(--danger)' : pct >= 95 ? 'var(--hl)' : pct >= 80 ? 'var(--brand-2)' : 'var(--ok)';
  const left = cap - used;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-[.88rem]">
        <b>{label}</b>
        <span className="tab-num muted">{used}/{cap} · <b style={{ color }}>{left > 0 ? `${left} seat${left === 1 ? '' : 's'} left` : left === 0 ? 'full' : `${-left} over`}</b></span>
      </div>
      <div className="meter"><i style={{ width: `${Math.min(pct, 100)}%`, background: color }} /></div>
      {sub && <div className="muted mt-1 text-[.76rem]">{sub}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-back" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-bold">{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

let toastSet;
export const toast = (msg) => toastSet?.(msg);
export function Toaster() {
  const [msg, setMsg] = useState(null);
  useEffect(() => { toastSet = (m) => { setMsg(m); setTimeout(() => setMsg(null), 3200); }; return () => { toastSet = null; }; }, []);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

export const SEV = { high: 'danger', medium: 'warn', low: 'info' };
export const fmtDate = (s) => (s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '–');
export const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');
export const ago = (s) => {
  if (!s) return 'never';
  const d = Math.floor((Date.now() - new Date(s)) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`;
};
export const Freshness = ({ date }) => {
  const d = date ? Math.floor((Date.now() - new Date(date)) / 86400000) : null;
  const tone = d === null ? 'danger' : d <= 30 ? 'ok' : d <= 90 ? 'warn' : 'danger';
  return <Badge tone={tone}>Updated {ago(date)}</Badge>;
};

export function Count({ to }) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    from.current = to;
    if (typeof window !== 'undefined' && (window.matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(to - start) < 2)) {
      setV(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 900);
      setV(Math.round(start + (to - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v.toLocaleString('en-IN')}</>;
}
