// Application state and actions. In-memory only (no localStorage/database),
// as required by the brief. Every action re-checks the logged-in role, so
// restricted actions are refused even if a control were reached directly.
// This demonstrates UI access control; it is NOT server-side security.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createSeedData } from '../data/seed.js';
import {
  DEMO_TODAY,
  JOB_MINUTES,
  LOCKOUT_ATTEMPTS,
  LOCKOUT_MS,
  SESSION_TIMEOUT_MS,
} from '../config.js';
import { CREATABLE_ROLES, ROLES, ROLE_LABELS } from '../lib/roles.js';
import { isLateSubmission, isWithinHorizon, validateAvailabilityInput } from '../lib/availability.js';
import { validateAllocation } from '../lib/validation.js';
import { JOB_STATUS, isAllocated } from '../lib/workload.js';
import { inWeek, overlaps } from '../lib/time.js';

const StoreContext = createContext(null);

export function useStore() {
  return useContext(StoreContext);
}

const denied = (roles) => ({
  ok: false,
  error: `Action refused: this is restricted to the ${roles.map((r) => ROLE_LABELS[r]).join(' or ')} role.`,
});

export function StoreProvider({ children }) {
  const [data, setData] = useState(createSeedData);
  const [resetVersion, setResetVersion] = useState(0);
  const [session, setSession] = useState(null);
  const [loginNotice, setLoginNotice] = useState(null);
  const [lockouts, setLockouts] = useState({}); // username -> { failures, lockedUntil }

  // Refs give actions synchronous access to the latest values.
  const dataRef = useRef(data);
  const sessionRef = useRef(session);
  const lockRef = useRef(lockouts);
  const lastActivity = useRef(Date.now());

  const commit = useCallback((next) => {
    dataRef.current = next;
    setData(next);
  }, []);
  const setSess = (s) => {
    sessionRef.current = s;
    setSession(s);
  };
  const setLocks = (l) => {
    lockRef.current = l;
    setLockouts(l);
  };

  const requireRole = (...roles) => (sessionRef.current && roles.includes(sessionRef.current.role) ? null : denied(roles));

  // ---------- Authentication (simulated) ----------
  const login = useCallback((usernameRaw, password) => {
    const username = usernameRaw.trim().toLowerCase();
    const now = Date.now();
    const account = dataRef.current.accounts.find((a) => a.username === username);
    const state = lockRef.current[username];
    if (state?.lockedUntil && state.lockedUntil > now) {
      return { ok: false, locked: true, lockedUntil: state.lockedUntil };
    }
    if (!account || account.password !== password) {
      if (!account) return { ok: false, error: 'Incorrect username or password.' };
      const failures = (state?.lockedUntil && state.lockedUntil <= now ? 0 : state?.failures ?? 0) + 1;
      if (failures >= LOCKOUT_ATTEMPTS) {
        const lockedUntil = now + LOCKOUT_MS;
        setLocks({ ...lockRef.current, [username]: { failures: 0, lockedUntil } });
        return { ok: false, locked: true, lockedUntil, justLocked: true };
      }
      setLocks({ ...lockRef.current, [username]: { failures, lockedUntil: null } });
      return { ok: false, error: 'Incorrect username or password.', remaining: LOCKOUT_ATTEMPTS - failures };
    }
    const { [username]: _cleared, ...rest } = lockRef.current;
    setLocks(rest);
    lastActivity.current = Date.now();
    setLoginNotice(null);
    setSess({ accountId: account.id, username, name: account.name, role: account.role, teacherId: account.teacherId });
    return { ok: true, role: account.role };
  }, []);

  const logout = useCallback((reason) => {
    setSess(null);
    setLoginNotice(
      reason === 'timeout'
        ? { tone: 'warning', text: 'Your session ended after 30 minutes of inactivity. Please sign in again.' }
        : { tone: 'info', text: 'You have signed out.' },
    );
    window.location.hash = '#/login';
  }, []);

  // NFR-12 demonstration: end the session after 30 minutes without activity.
  useEffect(() => {
    if (!session) return undefined;
    const bump = () => {
      lastActivity.current = Date.now();
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current >= SESSION_TIMEOUT_MS) logout('timeout');
    }, 10000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(timer);
    };
  }, [session, logout]);

  const simulateInactivity = useCallback(() => {
    lastActivity.current = Date.now() - SESSION_TIMEOUT_MS;
    logout('timeout');
  }, [logout]);

  // ---------- Teacher: Availability (FR-07, FR-08, FR-10) ----------
  const addAvailability = useCallback(({ date, start, end }) => {
    const deny = requireRole(ROLES.TEACHER);
    if (deny) return deny;
    const { teacherId } = sessionRef.current;
    const d = dataRef.current;
    const own = d.availability.filter((a) => a.teacherId === teacherId);
    const errors = validateAvailabilityInput({ date, start, end }, own);
    if (Object.keys(errors).length) return { ok: false, errors };
    const record = {
      id: `A-${String(d.seq.avail).padStart(4, '0')}`,
      teacherId,
      date,
      start: Number(start),
      end: Number(end),
      submittedOn: DEMO_TODAY,
      late: isLateSubmission(date, DEMO_TODAY),
      savedThisSession: true,
    };
    commit({ ...d, availability: [...d.availability, record], seq: { ...d.seq, avail: d.seq.avail + 1 } });
    return { ok: true, record };
  }, [commit]);

  const updateAvailability = useCallback((id, { start, end }) => {
    const deny = requireRole(ROLES.TEACHER);
    if (deny) return deny;
    const { teacherId } = sessionRef.current;
    const d = dataRef.current;
    const existing = d.availability.find((a) => a.id === id);
    if (!existing || existing.teacherId !== teacherId) return { ok: false, error: 'You can only edit your own Availability.' };
    if (!isWithinHorizon(existing.date)) return { ok: false, error: 'This date is outside the editable range.' };
    const own = d.availability.filter((a) => a.teacherId === teacherId);
    const errors = validateAvailabilityInput({ date: existing.date, start, end }, own, id);
    if (Object.keys(errors).length) return { ok: false, errors };
    const record = {
      ...existing,
      start: Number(start),
      end: Number(end),
      submittedOn: DEMO_TODAY,
      late: isLateSubmission(existing.date, DEMO_TODAY),
      savedThisSession: true,
    };
    commit({ ...d, availability: d.availability.map((a) => (a.id === id ? record : a)) });
    return { ok: true, record };
  }, [commit]);

  // ---------- Teacher: Job Preference (FR-09) ----------
  const saveJobPreference = useCallback(({ weekStart, slots, requestedHours }) => {
    const deny = requireRole(ROLES.TEACHER);
    if (deny) return deny;
    const { teacherId } = sessionRef.current;
    const errors = {};
    const hours = Number(requestedHours);
    if (requestedHours === '' || requestedHours == null || Number.isNaN(hours)) errors.requestedHours = 'Enter the number of teaching hours you would like.';
    else if (hours <= 0 || hours > 60) errors.requestedHours = 'Requested hours must be more than 0 and at most 60.';
    else if (Math.round(hours * 2) !== hours * 2) errors.requestedHours = 'Use whole or half hours (Jobs are 30 minutes).';
    if (!slots.length) errors.slots = 'Add at least one preferred teaching time.';
    const slotErrors = slots.map((s, i) => {
      if (Number(s.end) <= Number(s.start)) return 'End time must be after the start time.';
      const clash = slots.find((o, j) => j < i && o.day === s.day && overlaps(Number(s.start), Number(s.end), Number(o.start), Number(o.end)));
      return clash ? 'Overlaps another preferred time on the same day.' : null;
    });
    if (slotErrors.some(Boolean)) errors.slotRows = slotErrors;
    if (Object.keys(errors).length) return { ok: false, errors };

    const d = dataRef.current;
    const cleanSlots = slots
      .map((s) => ({ day: Number(s.day), start: Number(s.start), end: Number(s.end) }))
      .sort((a, b) => a.day - b.day || a.start - b.start);
    const existing = d.preferences.find((p) => p.teacherId === teacherId && p.weekStart === weekStart);
    let preferences;
    let seq = d.seq;
    if (existing) {
      preferences = d.preferences.map((p) => (p === existing ? { ...p, slots: cleanSlots, requestedHours: hours, savedOn: DEMO_TODAY } : p));
    } else {
      preferences = [
        ...d.preferences,
        { id: `P-${String(d.seq.pref).padStart(3, '0')}`, teacherId, weekStart, slots: cleanSlots, requestedHours: hours, savedOn: DEMO_TODAY },
      ];
      seq = { ...seq, pref: seq.pref + 1 };
    }
    commit({ ...d, preferences, seq });
    return { ok: true, updated: Boolean(existing) };
  }, [commit]);

  // ---------- Teacher: Reject Job (FR-28, FR-30) ----------
  const rejectJob = useCallback((jobId) => {
    const deny = requireRole(ROLES.TEACHER);
    if (deny) return deny;
    const { teacherId } = sessionRef.current;
    const d = dataRef.current;
    const job = d.jobs.find((j) => j.id === jobId);
    if (!job || job.teacherId !== teacherId || !isAllocated(job)) return { ok: false, error: 'You can only reject Jobs allocated to you.' };
    const updated = { ...job, teacherId: null, status: JOB_STATUS.UNALLOCATED };
    commit({ ...d, jobs: d.jobs.map((j) => (j.id === jobId ? updated : j)) });
    return { ok: true, job: updated };
  }, [commit]);

  // ---------- Manager: Teacher Profile (FR-11) ----------
  const updateTeacherProfile = useCallback((teacherId, { instruments, expertise, yearsExperience }) => {
    const deny = requireRole(ROLES.MANAGER);
    if (deny) return deny;
    const errors = {};
    if (!instruments.length) errors.instruments = 'Select at least one qualified Instrument.';
    const years = Number(yearsExperience);
    if (yearsExperience === '' || Number.isNaN(years)) errors.yearsExperience = 'Enter the years of teaching experience.';
    else if (!Number.isInteger(years) || years < 0 || years > 60) errors.yearsExperience = 'Enter a whole number from 0 to 60.';
    if (Object.keys(errors).length) return { ok: false, errors };
    const d = dataRef.current;
    commit({
      ...d,
      teachers: d.teachers.map((t) =>
        t.id === teacherId ? { ...t, profile: { instruments: [...instruments], expertise: [...expertise], yearsExperience: years } } : t,
      ),
    });
    return { ok: true };
  }, [commit]);

  // ---------- Manager: Job Allocation (FR-12, FR-19 to FR-27) ----------
  const checkAllocation = useCallback((draft) => {
    const deny = requireRole(ROLES.MANAGER);
    if (deny) return deny;
    const t0 = performance.now();
    const result = validateAllocation({ ...draft, id: draft.jobId }, dataRef.current);
    return { ok: true, result, elapsedMs: performance.now() - t0 };
  }, []);

  const allocateJob = useCallback((draft, weekStart) => {
    const deny = requireRole(ROLES.MANAGER);
    if (deny) return deny;
    if (draft.date < DEMO_TODAY) return { ok: false, error: 'The Job date cannot be in the past.' };
    if (!inWeek(draft.date, weekStart)) return { ok: false, error: 'The Job date must be inside the selected week.' };
    const t0 = performance.now();
    const d = dataRef.current;
    const result = validateAllocation({ ...draft, id: draft.jobId }, d);
    const elapsedMs = performance.now() - t0;
    if (!result.ok) return { ok: false, result, elapsedMs }; // invalid allocations are never saved
    const fields = {
      teacherId: draft.teacherId,
      date: draft.date,
      start: draft.start,
      end: draft.start + JOB_MINUTES,
      instrument: draft.instrument,
      studioId: draft.studioId,
      status: JOB_STATUS.ALLOCATED,
    };
    let job;
    let jobs;
    let seq = d.seq;
    if (draft.jobId) {
      job = { ...d.jobs.find((j) => j.id === draft.jobId), ...fields };
      jobs = d.jobs.map((j) => (j.id === draft.jobId ? job : j));
    } else {
      job = { id: `J-${d.seq.job}`, ...fields };
      jobs = [...d.jobs, job];
      seq = { ...seq, job: seq.job + 1 };
    }
    commit({ ...d, jobs, seq });
    return { ok: true, result, job, elapsedMs };
  }, [commit]);

  // ---------- IT Administrator: create account (FR-31) ----------
  const createAccount = useCallback((input) => {
    const deny = requireRole(ROLES.IT_ADMIN);
    if (deny) return deny;
    const d = dataRef.current;
    const name = input.name.trim();
    const username = input.username.trim().toLowerCase();
    const email = input.email.trim();
    const errors = {};
    if (!name) errors.name = 'Enter the full name.';
    if (!username) errors.username = 'Enter a username.';
    else if (!/^[a-z0-9._-]{3,30}$/.test(username)) errors.username = 'Use 3–30 characters: lowercase letters, numbers, dots, hyphens or underscores.';
    else if (d.accounts.some((a) => a.username === username)) errors.username = `The username "${username}" is already in use.`;
    if (!email) errors.email = 'Enter an email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address, e.g. name@sonara.example.';
    else if (d.accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) errors.email = 'This email address is already linked to an account.';
    if (!CREATABLE_ROLES.includes(input.role)) errors.role = 'Select Teacher or Manager.';
    if (!input.password) errors.password = 'Enter a temporary password.';
    else if (input.password.length < 8) errors.password = 'Use at least 8 characters.';
    if (input.password && input.confirmPassword !== input.password) errors.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errors).length) return { ok: false, errors };

    let teachers = d.teachers;
    let teacherId = null;
    const seq = { ...d.seq, account: d.seq.account + 1 };
    if (input.role === ROLES.TEACHER) {
      teacherId = `T${String(d.seq.teacher).padStart(2, '0')}`;
      teachers = [...teachers, { id: teacherId, name, email, profile: { instruments: [], expertise: [], yearsExperience: 0 } }];
      seq.teacher = d.seq.teacher + 1;
    }
    const account = {
      id: `U-N${String(d.seq.account).padStart(2, '0')}`,
      name, username, email, password: input.password, role: input.role, teacherId, createdInDemo: true,
    };
    commit({ ...d, teachers, accounts: [...d.accounts, account], seq });
    return { ok: true, account };
  }, [commit]);

  // ---------- Demo tools ----------
  const resetDemoData = useCallback(() => {
    const fresh = createSeedData();
    commit(fresh);
    setResetVersion((v) => v + 1);
    setLocks({});
    const s = sessionRef.current;
    if (s && !fresh.accounts.some((a) => a.id === s.accountId)) {
      setSess(null);
      setLoginNotice({ tone: 'info', text: 'Demo data was reset. The account you used was created during the demo and no longer exists.' });
      window.location.hash = '#/login';
    }
  }, [commit]);

  const value = useMemo(
    () => ({
      data,
      resetVersion,
      session,
      loginNotice,
      lockouts,
      login,
      logout,
      simulateInactivity,
      addAvailability,
      updateAvailability,
      saveJobPreference,
      rejectJob,
      updateTeacherProfile,
      checkAllocation,
      allocateJob,
      createAccount,
      resetDemoData,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, resetVersion, session, loginNotice, lockouts],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
