import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Alert, Badge, Button, Field } from '../components/ui.jsx';
import { DemoTools } from '../components/AppShell.jsx';
import { loginKey, useStore } from '../state/store.jsx';
import { ROLE_LABELS } from '../lib/roles.js';
import { LOCKOUT_ATTEMPTS } from '../config.js';

const FEATURED = ['alice.tan', 'jamie.lim', 'isaac.koh', 'grace.ho', 'it.admin'];

function formatCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function Login() {
  const { data, login, loginNotice, lockouts } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [now, setNow] = useState(Date.now());

  const lock = lockouts[loginKey(data.accounts, username)];
  const lockedFor = lock?.lockedUntil ? lock.lockedUntil - now : 0;

  useEffect(() => {
    if (lockedFor <= 0) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lockedFor > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault();
    const fieldErrors = {};
    if (!username.trim()) fieldErrors.username = 'Enter your username or email.';
    if (!password) fieldErrors.password = 'Enter your password.';
    setErrors(fieldErrors);
    setFormError(null);
    if (Object.keys(fieldErrors).length) return;
    const res = login(username, password);
    setNow(Date.now());
    if (res.ok) return;
    if (res.locked) {
      setFormError(null);
    } else {
      setFormError(
        res.remaining != null
          ? `${res.error} ${res.remaining} attempt${res.remaining === 1 ? '' : 's'} left before this account is locked for 15 minutes.`
          : res.error,
      );
      setPassword('');
    }
  };

  const featured = data.accounts.filter((a) => FEATURED.includes(a.username));
  const created = data.accounts.filter((a) => a.createdInDemo);
  const fill = (a) => {
    setUsername(a.username);
    setPassword(a.password);
    setErrors({});
    setFormError(null);
  };

  return (
    <div className="login-page">
      <div className="login-topright"><DemoTools /></div>
      <section className="login-hero" aria-label="About Sonara 2.0">
        <div className="brand brand-light">
          <span className="brand-mark"><Icon name="music" size={20} /></span>
          <span className="brand-name">Sonara <span className="brand-version">2.0</span></span>
        </div>
        <h1 className="login-hero-title">Music school staffing, scheduling and Workload in one place.</h1>
        <ul className="login-hero-list">
          <li><Icon name="calendar" /> Teachers submit Availability and Job Preferences, and review their weekly Jobs.</li>
          <li><Icon name="gauge" /> Managers monitor Workload and allocate Jobs with automatic rule checks.</li>
          <li><Icon name="userPlus" /> IT Administrators create Teacher and Manager accounts.</li>
        </ul>
        <p className="login-hero-note">INF2001 interactive prototype · mock data only · no backend</p>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-card">
          <h2 id="login-title" className="login-title">Sign in</h2>
          <p className="muted">Your role is determined by your account.</p>

          {loginNotice && <Alert tone={loginNotice.tone} className="mt-3">{loginNotice.text}</Alert>}
          {lockedFor > 0 && (
            <Alert tone="danger" title="Account temporarily locked" className="mt-3">
              Too many failed sign-in attempts ({LOCKOUT_ATTEMPTS} in a row). Try again in{' '}
              <strong className="tabular">{formatCountdown(lockedFor)}</strong>. (Demonstration of NFR-13; use Reset demo data to clear.)
            </Alert>
          )}
          {formError && lockedFor <= 0 && <Alert tone="danger" className="mt-3">{formError}</Alert>}

          <form onSubmit={submit} noValidate className="stack mt-4">
            <Field label="Username or email" error={errors.username} required>
              {(p) => (
                <input {...p} className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              )}
            </Field>
            <Field label="Password" error={errors.password} required>
              {(p) => (
                <input {...p} type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              )}
            </Field>
            <Button type="submit" className="w-full" icon="arrowRight" disabled={lockedFor > 0}>Sign in</Button>
          </form>
        </div>

        <div className="login-card demo-accounts">
          <h3 className="section-title">Demonstration accounts</h3>
          <p className="muted small">Select an account to fill the form, then choose Sign in. Every Teacher uses the password <code>teacher123</code>.</p>
          <ul className="demo-list">
            {[...featured, ...created].map((a) => (
              <li key={a.id}>
                <button type="button" className="demo-account" onClick={() => fill(a)}>
                  <span>
                    <span className="demo-name">{a.name}</span>
                    <span className="demo-cred tabular">{a.username} / {a.password}</span>
                  </span>
                  <span className="demo-tags">
                    {a.createdInDemo && <Badge tone="info" icon="plus">New</Badge>}
                    <span className={`role-pill role-${a.role}`}>{ROLE_LABELS[a.role]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="muted small">Simulated login for demonstration only. It is not production-grade security.</p>
        </div>
      </section>
    </div>
  );
}
