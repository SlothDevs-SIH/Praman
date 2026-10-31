import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Languages } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { useT } from '../lib/i18n.jsx';
import { useApi } from '../lib/api.js';
import { Skeleton } from './ui.jsx';
import { CommandSearch } from './CommandSearch.jsx';
import { TreeMenu } from './TreeMenu.jsx';
import { DotBackdrop } from './DotBackdrop.jsx';
import Onboarding from '../pages/Onboarding.jsx';

const TREE = [
  { id: 'adm-over', label: 'Overview', icon: '▦', to: '/admin', roles: ['admin', 'regulator'] },
  {
    id: 'adm-reg',
    label: 'Registry & records',
    icon: '◧',
    children: [
      { id: 'c-inst', icon: '◧', label: 'Institutions', to: '/admin/institutions', roles: ['admin', 'regulator'] },
      { id: 'c-stu', icon: '⌕', label: 'Search students', to: '/institution/students', roles: ['admin', 'regulator'] },
    ],
  },
  {
    id: 'adm-comp',
    label: 'Anomalies & action',
    icon: '⇄',
    children: [
      { id: 'o-flags', icon: '⚑', label: 'Anomaly flags', to: '/admin/flags', roles: ['admin', 'regulator'] },
      { id: 'o-audit', icon: '✓', label: 'Audit & Verify chain', to: '/admin/audit', roles: ['admin'] },
    ],
  },
  { id: 'adm-rep', label: 'Reports', icon: '▤', to: '/admin/reports', roles: ['admin', 'regulator'] },

  // Institution Representative
  { id: 'inst-dash', label: 'Dashboard', icon: '▦', to: '/institution', roles: ['institution'] },
  {
    id: 'inst-adm',
    label: 'Admissions & APAAR',
    icon: '☰',
    children: [
      { id: 'i-up', icon: '⇪', label: 'Upload & autocorrect', to: '/institution/upload', roles: ['institution'] },
      { id: 'i-stu', icon: '☰', label: 'Enrolled students', to: '/institution/students', roles: ['institution'] },
    ],
  },
  {
    id: 'inst-coord',
    label: 'Handshakes & API',
    icon: '⇄',
    children: [
      { id: 'i-inb', icon: '⇋', label: 'Duplicate handshakes', to: '/institution/inbox', roles: ['institution'] },
      { id: 'i-dev', icon: '⚙', label: 'ERP API & Webhooks', to: '/institution/developers', roles: ['institution'] },
    ],
  },

  // Student
  { id: 'stu-me', label: 'My APAAR record', icon: '◈', to: '/me', roles: ['student'] },

  // Shared Verification Portal
  { id: 'ver-portal', label: 'Verify APAAR', icon: '⛨', to: '/verify', roles: ['admin', 'regulator', 'institution', 'verifier', 'student'] },
];

export const ROLE_LABEL = {
  admin: 'AICTE Administrator',
  regulator: 'State Education Regulator',
  institution: 'Institution Representative',
  verifier: 'Employer Verifier',
  student: 'Enrolled Student',
};

function menuFor(role, t) {
  const out = [];
  for (const g of TREE) {
    if (g.to) {
      if (g.roles?.includes(role)) out.push({ id: g.id, label: t(g.label), icon: g.icon, to: g.to });
      continue;
    }
    const kids = (g.children ?? [])
      .filter((c) => c.roles.includes(role))
      .map((c) => ({ id: c.id, label: t(c.label), to: c.to, icon: c.icon }));
    if (kids.length === 1) out.push({ ...kids[0], icon: g.icon });
    else if (kids.length > 1) out.push({ id: g.id, label: t(g.label), icon: g.icon, children: kids });
  }
  return out;
}

const flat = (items) => items.flatMap((i) => (i.children ? flat(i.children) : [i]));

const activeLeaf = (items, path) => {
  const leaves = flat(items).filter(
    (l) => l.to && (l.to === '/admin' || l.to === '/institution' ? path === l.to : path === l.to || path.startsWith(l.to + '/'))
  );
  leaves.sort((x, y) => (y.to?.length ?? 0) - (x.to?.length ?? 0));
  return leaves[0]?.id ?? null;
};

const initials = (name) =>
  (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'P';

export const Logo = ({ size = 30 }) => (
  <Link to="/" className="brand">
    <span className="logo" style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" width={size * 0.72} height={size * 0.72} fill="none" aria-hidden="true">
        <path
          d="M9 21c0-6 5-9 9-9h5M23 12l-3-3m3 3-3 3M9 21h8"
          stroke="#ff8a2a"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
    <span className="lbl">PRAMAN</span>
  </Link>
);

export function LangToggle() {
  const { lang, toggle } = useT();
  return (
    <button className="btn sm" onClick={toggle} aria-label="Switch language">
      <Languages size={14} />
      <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
    </button>
  );
}

export default function Shell() {
  const { user, ready, logout } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [mini, setMini] = useState(() => {
    try {
      return localStorage.getItem('side-mini') === '1';
    } catch {
      return false;
    }
  });

  const toggleMini = (v) => {
    setMini(v);
    try {
      localStorage.setItem('side-mini', v ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const { data: notes } = useApi(user ? '/notifications' : null, { poll: 20000 });

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    document.body.style.overflow = '';
  }, []);

  const menu = useMemo(() => (user ? menuFor(user.role, t) : []), [user, t]);

  const commands = useMemo(() => {
    const pages = flat(menu).map((l) => ({
      id: l.id,
      title: l.label,
      section: 'Suggestions',
      icon: l.icon,
      action: () => nav(l.to),
    }));
    return [
      ...pages,
      {
        id: 'x-verify',
        title: 'Verify APAAR ID',
        section: 'Quick Actions',
        icon: '⛨',
        shortcut: 'V',
        action: () => nav('/verify'),
      },
      {
        id: 'x-notes',
        title: user?.role === 'institution' ? 'Duplicate handshakes & notifications' : 'System notifications',
        section: 'Settings',
        icon: '◔',
        action: () => nav(user?.role === 'institution' ? '/institution/inbox' : user?.role === 'student' ? '/me' : '/admin/flags'),
      },
      {
        id: 'x-home',
        title: 'Landing page',
        section: 'Help',
        icon: '⌂',
        action: () => nav('/'),
      },
      {
        id: 'x-out',
        title: 'Sign out',
        section: 'Settings',
        icon: '↩',
        action: () => {
          logout();
          nav('/');
        },
      },
    ];
  }, [menu, nav, logout, user]);

  const findExtra = useCallback(
    (q) => {
      const out = [];
      if (user?.role === 'admin' || user?.role === 'regulator') {
        out.push({
          id: 'q-inst',
          title: `Search institutions for “${q}”`,
          section: 'Search',
          icon: '◧',
          action: () => nav(`/admin/institutions?q=${encodeURIComponent(q)}`),
        });
      }
      if (user?.role === 'institution' || user?.role === 'admin' || user?.role === 'regulator') {
        out.push({
          id: 'q-stu',
          title: `Search students for “${q}”`,
          section: 'Search',
          icon: '☰',
          action: () => nav(`/institution/students?q=${encodeURIComponent(q)}`),
        });
      }
      out.push({
        id: 'q-ver',
        title: `Verify APAAR ID “${q}”`,
        section: 'Search',
        icon: '⛨',
        action: () => nav(`/verify?apaar=${encodeURIComponent(q)}`),
      });
      return out;
    },
    [nav, user]
  );

  if (!ready) {
    return (
      <div className="page p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton h={40} />
        <Skeleton h={220} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (user.role === 'new') return <Onboarding />;

  const notifTarget =
    user.role === 'institution' ? '/institution/inbox' : user.role === 'student' ? '/me' : '/admin/flags';

  return (
    <div className={`shell ${mini ? 'mini' : ''}`}>
      <DotBackdrop />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      <aside className={`side ${open ? 'open' : ''}`} aria-label="Primary">
        <div className="side-head">
          <Logo size={30} />
          <button
            type="button"
            className="side-toggle"
            onClick={() => toggleMini(!mini)}
            aria-label={mini ? 'Expand the menu' : 'Collapse the menu'}
            aria-pressed={mini}
            title={mini ? 'Expand' : 'Collapse'}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M9 4v16" />
              <path className="chev" d="m15 9-3 3 3 3" />
            </svg>
          </button>
        </div>

        <div className="profile">
          <span className="avatar" aria-hidden="true">
            {initials(user.name)}
          </span>
          <div className="who">
            <strong>{user.name}</strong>
            <span>{ROLE_LABEL[user.role] || user.role}</span>
            {user.institution && (
              <span className="text-[.7rem] opacity-75 truncate max-w-[135px]">{user.institution.name}</span>
            )}
          </div>
          <button
            type="button"
            className="signout"
            onClick={() => {
              logout();
              nav('/');
            }}
            aria-label="Sign out"
            title="Sign out"
          >
            ⏻
          </button>
        </div>

        <nav aria-label="Pages">
          <TreeMenu
            menuData={menu}
            activeId={activeLeaf(menu, loc.pathname)}
            onSelect={(i) => i.to && nav(i.to)}
            onGroupOpen={() => mini && toggleMini(false)}
          />
        </nav>
      </aside>

      <div className="main">
        <header className="top">
          <button className="btn sm menu-btn" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            ☰
          </button>
          <CommandSearch items={commands} extra={findExtra} />
          <div className="flex items-center gap-2">
            <LangToggle />
            <Link
              className="btn sm"
              to={notifTarget}
              aria-label={`Notifications, ${notes?.unread ?? 0} unread`}
            >
              ◔ {notes?.unread ? <strong>{notes.unread} open</strong> : 'Notifications'}
            </Link>
          </div>
        </header>
        <main id="main" className="content page-in" key={loc.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
