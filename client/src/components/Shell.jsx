import { useState } from 'react';
import { NavLink, Outlet, Navigate, Link } from 'react-router-dom';
import { LayoutDashboard, Building2, Flag, FileBarChart, ScrollText, ShieldCheck, Upload, Users, Inbox, Code2, IdCard, LogOut, Menu, Languages } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { useT } from '../lib/i18n.jsx';
import { Skeleton } from './ui.jsx';

const NAV = {
  admin: [['/admin', 'Overview', LayoutDashboard, true], ['/admin/institutions', 'Institutions', Building2], ['/admin/flags', 'Flags', Flag], ['/admin/reports', 'Reports', FileBarChart], ['/admin/audit', 'Audit trail', ScrollText], ['/verify', 'Verify', ShieldCheck]],
  institution: [['/institution', 'Dashboard', LayoutDashboard, true], ['/institution/upload', 'Upload data', Upload], ['/institution/students', 'Students', Users], ['/institution/inbox', 'Inbox', Inbox], ['/institution/developers', 'Developers', Code2], ['/verify', 'Verify', ShieldCheck]],
  verifier: [['/verify', 'Verify', ShieldCheck, true]],
  student: [['/me', 'My record', IdCard, true]],
};
NAV.regulator = [['/admin', 'Overview', LayoutDashboard, true], ['/admin/institutions', 'Institutions', Building2], ['/admin/flags', 'Flags', Flag], ['/admin/reports', 'Reports', FileBarChart], ['/verify', 'Verify', ShieldCheck]];
const ROLE_LABEL = { admin: 'AICTE', regulator: 'Regulator', institution: 'Institution', verifier: 'Verifier', student: 'Student' };

export const Logo = ({ size = 30 }) => (
  <Link to="/" className="flex items-center gap-2 font-extrabold" style={{ fontSize: size * 0.62 }}>
    <img src="/favicon.svg" width={size} height={size} alt="" />
    <span>Praman</span>
  </Link>
);

export function LangToggle() {
  const { lang, toggle } = useT();
  return <button className="btn btn-sm" onClick={toggle} aria-label="Switch language"><Languages size={15} />{lang === 'en' ? 'हिन्दी' : 'English'}</button>;
}

export default function Shell() {
  const { user, ready, logout } = useAuth();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  if (!ready) return <div className="page"><Skeleton h={40} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  const items = NAV[user.role] || [];

  return (
    <div className="shell">
      <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="mb-3 px-1"><Logo /></div>
        {items.map(([to, label, Icon, end]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>
            <Icon size={18} />{t(label)}
          </NavLink>
        ))}
        <div className="mt-auto border-t pt-3" style={{ borderColor: 'var(--line)' }}>
          <div className="px-2 pb-2">
            <div className="truncate text-[.86rem] font-bold">{user.name}</div>
            <div className="muted truncate text-[.76rem]">{ROLE_LABEL[user.role]}{user.institution ? ` · ${user.institution.name}` : ''}</div>
          </div>
          <button className="nav btn btn-ghost w-full justify-start" onClick={logout}><LogOut size={17} />{t('Sign out')}</button>
        </div>
      </aside>
      <main className="min-w-0">
        <header className="flex items-center justify-between gap-2 px-4 pt-3 md:justify-end">
          <button className="btn btn-sm md:!hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={17} /></button>
          <LangToggle />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
