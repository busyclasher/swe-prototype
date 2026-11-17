import { useEffect } from 'react';
import AppShell from './components/AppShell.jsx';
import { ButtonLink, EmptyState, useToast } from './components/ui.jsx';
import { useStore } from './state/store.jsx';
import { navigate, useHashLocation } from './state/router.js';
import { HOME_ROUTE, ROLES, ROLE_LABELS } from './lib/roles.js';
import Login from './pages/Login.jsx';
import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx';
import TeacherJobs from './pages/teacher/TeacherJobs.jsx';
import AvailableJobs from './pages/teacher/AvailableJobs.jsx';
import TeacherAvailability from './pages/teacher/TeacherAvailability.jsx';
import JobPreferences from './pages/teacher/JobPreferences.jsx';
import ManagerDashboard from './pages/manager/ManagerDashboard.jsx';
import ManagerAvailability from './pages/manager/ManagerAvailability.jsx';
import TeacherProfiles from './pages/manager/TeacherProfiles.jsx';
import JobAllocation from './pages/manager/JobAllocation.jsx';
import AccountManagement from './pages/admin/AccountManagement.jsx';

const { TEACHER, MANAGER, IT_ADMIN } = ROLES;

/** Route table: every protected page declares the roles allowed to open it (NFR-08, NFR-09). */
export const ROUTES = {
  '/teacher': { title: 'Teacher Dashboard', roles: [TEACHER], Component: TeacherDashboard },
  '/teacher/jobs': { title: 'My Jobs', roles: [TEACHER], Component: TeacherJobs },
  '/teacher/available': { title: 'Available Jobs', roles: [TEACHER], Component: AvailableJobs },
  '/teacher/availability': { title: 'Availability', roles: [TEACHER], Component: TeacherAvailability },
  '/teacher/preferences': { title: 'Job Preferences', roles: [TEACHER], Component: JobPreferences },
  '/manager': { title: 'Manager Dashboard', roles: [MANAGER], Component: ManagerDashboard },
  '/manager/availability': { title: 'Teacher Availability', roles: [MANAGER], Component: ManagerAvailability },
  '/manager/profiles': { title: 'Teacher Profiles', roles: [MANAGER], Component: TeacherProfiles },
  '/manager/allocation': { title: 'Job Allocation', roles: [MANAGER], Component: JobAllocation },
  '/admin/accounts': { title: 'Account Management', roles: [IT_ADMIN], Component: AccountManagement },
};

function AccessDenied({ route, role }) {
  return (
    <div className="narrow">
      <EmptyState
        icon="lock"
        title="Access denied"
        action={<ButtonLink to={HOME_ROUTE[role]} variant="primary" icon="home">Go to my dashboard</ButtonLink>}
      >
        This page is available to the {route.roles.map((r) => ROLE_LABELS[r]).join(' or ')} role only. You are signed in as{' '}
        {ROLE_LABELS[role]}. (Prototype demonstration of role-based access, NFR-09.)
      </EmptyState>
    </div>
  );
}

function NotFound({ role }) {
  return (
    <div className="narrow">
      <EmptyState icon="info" title="Page not found" action={<ButtonLink to={HOME_ROUTE[role]} variant="primary" icon="home">Go to my dashboard</ButtonLink>}>
        The page you requested does not exist.
      </EmptyState>
    </div>
  );
}

export default function App() {
  const { session, resetVersion } = useStore();
  const { path, query } = useHashLocation();
  const route = ROUTES[path];
  const toast = useToast();

  useEffect(() => {
    toast.clear?.();
  }, [session?.accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  // NFR-08: unauthenticated users can only reach the login page.
  useEffect(() => {
    if (!session && path !== '/login') navigate('/login');
    if (session && (path === '/login' || path === '/')) navigate(HOME_ROUTE[session.role]);
  }, [session, path]);

  useEffect(() => {
    if (route) document.title = `${route.title} · Sonara 2.0`;
    else document.title = 'Sign in · Sonara 2.0';
    window.scrollTo(0, 0);
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) return <Login />;
  if (path === '/login' || path === '/') return null;

  let body;
  let title = 'Sonara 2.0';
  if (!route) body = <NotFound role={session.role} />;
  else if (!route.roles.includes(session.role)) {
    body = <AccessDenied route={route} role={session.role} />;
    title = 'Access denied';
  } else {
    const { Component } = route;
    body = <Component key={`${session.accountId}:${resetVersion}`} query={query} />;
    title = route.title;
  }
  return (
    <AppShell path={path} title={title}>
      {body}
    </AppShell>
  );
}
