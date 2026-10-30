import { useState } from 'react';
import { NavLink, Outlet, Navigate, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Flag,
  FileBarChart,
  ScrollText,
  ShieldCheck,
  Upload,
  Users,
  Inbox,
  Code2,
  IdCard,
  LogOut,
  Menu,
  Languages,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { useT } from '../lib/i18n.jsx';
import { Skeleton } from './ui.jsx';
import { CommandSearch } from './CommandSearch.jsx';

const NAV = {
  admin: [
    ['/admin', 'Overview', LayoutDashboard, true],
    ['/admin/institutions', 'Institutions', Building2],
    ['/admin/flags', 'Flags', Flag],
    ['/admin/reports', 'Reports', FileBarChart],
    ['/admin/audit', 'Audit trail', ScrollText],
    ['/verify', 'Verify APAAR', ShieldCheck],
  ],
  institution: [
    ['/institution', 'Dashboard', LayoutDashboard, true],
    ['/institution/upload', 'Upload data', Upload],
    ['/institution/students', 'Students', Users],
    ['/institution/inbox', 'Inbox', Inbox],
    ['/institution/developers', 'Developers', Code2],
    ['/verify', 'Verify APAAR', ShieldCheck],
  ],
  verifier: [
    ['/verify', 'Verify APAAR', ShieldCheck, true],
  ],
  student: [
    ['/me', 'My record', IdCard, true],
    ['/verify', 'Public verify', ShieldCheck],
  ],
};
NAV.regulator = [
  ['/admin', 'Overview', LayoutDashboard, true],
  ['/admin/institutions', 'Institutions', Building2],
  ['/admin/flags', 'Flags', Flag],
  ['/admin/reports', 'Reports', FileBarChart],
  ['/verify', 'Verify APAAR', ShieldCheck],
];

const ROLE_LABEL = {
  admin: 'AICTE Administrator',
  regulator: 'State Education Regulator',
  institution: 'Institution Portal',
  verifier: 'Employer Verifier',
  student: 'Student Portal',
};

export const Logo = ({ size = 30 }) => (
  <Link to="/" className="flex items-center gap-2.5 font-extrabold text-inherit tracking-tight" style={{ fontSize: size * 0.62 }}>
    <div className="grid place-items-center rounded-xl bg-gradient-to-tr from-[#1a3fa8] to-[#2f6bff] p-1.5 shadow-md">
      <svg viewBox="0 0 32 32" width={size * 0.75} height={size * 0.75} fill="none">
        <path d="M9 21c0-6 5-9 9-9h5M23 12l-3-3m3 3-3 3M9 21h8" stroke="#ffa25c" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    <span className="font-extrabold text-foreground">Praman</span>
  </Link>
);

export function LangToggle() {
  const { lang, toggle } = useT();
  return (
    <button className="btn btn-sm btn-ghost border border-line" onClick={toggle} aria-label="Switch language">
      <Languages size={15} />
      <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
    </button>
  );
}

export default function Shell() {
  const { user, ready, logout } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  if (!ready) {
    return (
      <div className="page p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton h={40} />
        <Skeleton h={220} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const items = NAV[user.role] || [];

  const commandItems = [
    ...items.map(([to, label]) => ({
      id: to,
      title: t(label),
      section: 'Navigation',
      action: () => nav(to),
    })),
    {
      id: 'verify-now',
      title: 'Verify APAAR ID',
      section: 'Quick Actions',
      shortcut: 'V',
      action: () => nav('/verify'),
    },
    {
      id: 'sign-out-cmd',
      title: 'Sign Out',
      section: 'Account',
      action: logout,
    },
  ];

  return (
    <div className="shell">
      <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      
      {/* Liquid Glass Sidebar */}
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="mb-4 px-2 pt-1 flex items-center justify-between">
          <Logo size={32} />
        </div>

        <nav className="flex flex-col gap-1">
          {items.map(([to, label, Icon, end]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Glass Profile Card */}
        <div className="profile">
          <div className="flex items-center gap-3">
            <div className="avatar font-bold text-sm">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="who">
              <strong>{user.name}</strong>
              <span>{ROLE_LABEL[user.role]}</span>
              {user.institution && (
                <span className="text-[.7rem] opacity-75 truncate max-w-[140px]">
                  {user.institution.name}
                </span>
              )}
            </div>
            <button
              className="signout ml-auto"
              onClick={logout}
              title={t('Sign out')}
              aria-label={t('Sign out')}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex flex-col min-h-screen bg-[var(--bg)]">
        {/* Top Ticker and Command Bar */}
        <header className="top-bar">
          <div className="flex items-center gap-3">
            <button
              className="btn btn-sm md:!hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="ticker hidden lg:flex">
              <span className="ticker-tag">
                <span className="ticker-dot" /> Live System
              </span>
              <div className="ticker-view">
                <div className="ticker-track">
                  <span className="ticker-item">
                    AICTE APAAR ID Synchronization: <b>Zero-leakage SHA-256 enabled</b>
                  </span>
                  <span className="ticker-item">
                    Tamper-Evident QR: <b>Ed25519 digital signatures verified</b>
                  </span>
                  <span className="ticker-item">
                    Bilateral Soft Handshake: <b>No disputes, automated reconciliation</b>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CommandSearch items={commandItems} />
            <LangToggle />
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 max-w-[1340px] w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
