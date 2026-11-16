import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { Button, Modal, useToast } from './ui.jsx';
import { useStore } from '../state/store.jsx';
import { ROLE_LABELS } from '../lib/roles.js';
import { DEMO_TODAY } from '../config.js';
import { fmtDate } from '../lib/time.js';

export const NAV = {
  TEACHER: [
    { to: '/teacher', label: 'Dashboard', icon: 'home' },
    { to: '/teacher/jobs', label: 'My Jobs', icon: 'jobs' },
    { to: '/teacher/availability', label: 'Availability', icon: 'calendar' },
    { to: '/teacher/preferences', label: 'Job Preferences', icon: 'sliders' },
  ],
  MANAGER: [
    { to: '/manager', label: 'Dashboard', icon: 'gauge' },
    { to: '/manager/availability', label: 'Teacher Availability', icon: 'calendar' },
    { to: '/manager/profiles', label: 'Teacher Profiles', icon: 'users' },
    { to: '/manager/allocation', label: 'Job Allocation', icon: 'allocate' },
  ],
  IT_ADMIN: [{ to: '/admin/accounts', label: 'Account Management', icon: 'userPlus' }],
};

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><Icon name="music" size={18} /></span>
      <span className="brand-name">Sonara <span className="brand-version">2.0</span></span>
    </div>
  );
}

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function DemoTools({ align = 'right' }) {
  const { resetDemoData, simulateInactivity, session } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <Button variant="ghost" icon="tools" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)} className="menu-trigger">
        <span className="hide-sm">Demo tools</span>
      </Button>
      {open && (
        <div className={`menu-panel menu-${align}`} role="menu">
          <p className="menu-caption">Presentation helpers (prototype only)</p>
          <button type="button" role="menuitem" className="menu-item" onClick={() => { setOpen(false); setConfirmReset(true); }}>
            <Icon name="refresh" /> Reset demo data
          </button>
          {session && (
            <button type="button" role="menuitem" className="menu-item" onClick={() => { setOpen(false); simulateInactivity(); }}>
              <Icon name="clock" /> Simulate 30-minute inactivity
            </button>
          )}
        </div>
      )}
      <Modal
        open={confirmReset}
        title="Reset demo data?"
        onClose={() => setConfirmReset(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)} data-autofocus>Cancel</Button>
            <Button
              variant="primary"
              icon="refresh"
              onClick={() => {
                resetDemoData();
                setConfirmReset(false);
                toast('success', 'Demo data reset to the initial dataset.');
              }}
            >
              Reset demo data
            </Button>
          </>
        }
      >
        <p>
          All Availability, Job Preferences, Profiles, Job allocations, rejections, created accounts and login lockouts
          return to the initial sample data. Use this between demonstration runs.
        </p>
      </Modal>
    </div>
  );
}

export default function AppShell({ path, title, children }) {
  const { session, logout } = useStore();
  const [drawer, setDrawer] = useState(false);
  const items = NAV[session.role];

  useEffect(() => setDrawer(false), [path]);
  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  const isActive = (to) => path === to;

  const nav = (
    <nav aria-label="Main navigation">
      <ul className="nav-list">
        {items.map((it) => (
          <li key={it.to}>
            <a href={`#${it.to}`} className={`nav-link ${isActive(it.to) ? 'active' : ''}`} aria-current={isActive(it.to) ? 'page' : undefined}>
              <Icon name={it.icon} /> <span>{it.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );

  const roleCard = (
    <div className="sidebar-user">
      <span className="avatar" aria-hidden="true">{initials(session.name)}</span>
      <div className="sidebar-user-text">
        <span className="sidebar-user-name">{session.name}</span>
        <span className={`role-pill role-${session.role}`}><Icon name="shield" size={12} /> {ROLE_LABELS[session.role]}</span>
      </div>
    </div>
  );

  return (
    <div className="shell">
      <a href="#main" className="skip-link">Skip to main content</a>
      <aside className="sidebar" aria-label="Sidebar">
        <Brand />
        {nav}
        <div className="sidebar-foot">
          {roleCard}
          <Button variant="ghost" icon="logout" className="w-full justify-start" onClick={() => logout()}>Log out</Button>
        </div>
      </aside>

      {drawer && <div className="drawer-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <div className={`drawer ${drawer ? 'open' : ''}`} id="mobile-nav" aria-hidden={!drawer} inert={drawer ? undefined : ''}>
        <div className="drawer-head">
          <Brand />
          <button type="button" className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close menu"><Icon name="x" /></button>
        </div>
        {roleCard}
        {nav}
        <div className="sidebar-foot">
          <Button variant="ghost" icon="logout" className="w-full justify-start" onClick={() => logout()}>Log out</Button>
        </div>
      </div>

      <div className="main-col">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} aria-controls="mobile-nav">
            <Icon name="menu" />
          </button>
          <div className="topbar-title">
            <span className="topbar-page">{title}</span>
            <span className="demo-date" title="The prototype uses a fixed demonstration date">
              <Icon name="calendar" size={14} /> <span className="hide-sm">Demo date:&nbsp;</span>{fmtDate(DEMO_TODAY)}
            </span>
          </div>
          <div className="topbar-actions">
            <DemoTools />
            <span className={`role-pill role-${session.role} topbar-role`}>
              <Icon name="shield" size={12} /> <span className="hide-sm">{session.name} · </span>{ROLE_LABELS[session.role]}
            </span>
            <Button variant="secondary" icon="logout" onClick={() => logout()} className="topbar-logout" aria-label="Log out">
              <span className="hide-sm">Log out</span>
            </Button>
          </div>
        </header>
        <main id="main" className="content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
