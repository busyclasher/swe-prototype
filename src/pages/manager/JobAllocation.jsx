// UC07 Allocate Weekly Jobs - FR-12 to FR-27.
// The Manager selects one week, compares up to three Teachers, enters the Job
// details and submits. All eight rules are checked; the Job is saved only if
// every rule passes. There is no automatic allocation.

import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Alert, Badge, Button, Card, EmptyState, Field, PageHeader, useToast } from '../../components/ui.jsx';
import { JobStatusBadge, studioLabel } from '../../components/JobList.jsx';
import { LateBadge } from '../teacher/TeacherAvailability.jsx';
import { PreferenceSummary, selectableWeeks } from '../teacher/JobPreferences.jsx';
import { ProfileView } from './TeacherProfiles.jsx';
import { WorkloadBadge } from './ManagerDashboard.jsx';
import { useStore } from '../../state/store.jsx';
import { CURRENT_WEEK_START, DEMO_TODAY, JOB_MINUTES, MAX_COMPARE } from '../../config.js';
import { fmtDate, fmtDateLong, fmtDateShort, fmtHours, fmtRange, fmtTime, fmtWeek, inWeek, timeOptions, weekDates } from '../../lib/time.js';
import { JOB_STATUS, byDateTime, exceedsThreshold, isAllocated, teacherJobsInWeek, weeklyHours } from '../../lib/workload.js';

const TIMES = timeOptions(6 * 60, 22 * 60, 15);
const emptyForm = (date) => ({ jobId: '', date, start: '', instrument: '', teacherId: '', studioId: '' });
const firstDay = (week) => (inWeek(DEMO_TODAY, week) ? DEMO_TODAY : week);

/** FR-17: Location = the Studio(s) where the Teacher has allocated Jobs on the date. */
function locationSegments(jobs, teacherId, date) {
  const list = jobs.filter((j) => isAllocated(j) && j.teacherId === teacherId && j.date === date).sort(byDateTime);
  const segs = [];
  for (const j of list) {
    const last = segs[segs.length - 1];
    if (last && last.studioId === j.studioId && last.end === j.start) last.end = j.end;
    else segs.push({ studioId: j.studioId, start: j.start, end: j.end });
  }
  return segs;
}

function CompareCard({ teacher, week, locationDate, data, onRemove, onUse }) {
  const hours = weeklyHours(data.jobs, teacher.id, week);
  const pref = data.preferences.find((p) => p.teacherId === teacher.id && p.weekStart === week);
  const segs = locationSegments(data.jobs, teacher.id, locationDate);
  const days = weekDates(week);
  return (
    <article className="compare-card" aria-label={`Comparison: ${teacher.name}`}>
      <header className="compare-head">
        <h3 className="compare-name">{teacher.name}</h3>
        <button type="button" className="icon-btn icon-btn-sm" onClick={onRemove} aria-label={`Remove ${teacher.name} from comparison`}>
          <Icon name="x" size={16} />
        </button>
      </header>

      <section className="compare-sec">
        <h4 className="compare-label">Workload (selected week)</h4>
        <p className="compare-big tabular">{fmtHours(hours)}</p>
        <WorkloadBadge over={exceedsThreshold(hours)} />
      </section>

      <section className="compare-sec">
        <h4 className="compare-label">Availability (selected week)</h4>
        <ul className="compare-days">
          {days.map((d) => {
            const recs = data.availability.filter((a) => a.teacherId === teacher.id && a.date === d).sort((a, b) => a.start - b.start);
            return (
              <li key={d}>
                <span className="compare-day">{fmtDateShort(d)}</span>
                <span>
                  {recs.length ? (
                    recs.map((a) => (
                      <span key={a.id} className="range-line">
                        <span className="tabular">{fmtRange(a.start, a.end)}</span>
                        {a.late && <LateBadge record={a} />}
                      </span>
                    ))
                  ) : (
                    <span className="muted">Not available</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="compare-sec">
        <h4 className="compare-label">Job Preference (selected week)</h4>
        {pref ? <PreferenceSummary pref={pref} weekStartIso={week} /> : <p className="muted">No Job Preference recorded for this week.</p>}
      </section>

      <section className="compare-sec">
        <h4 className="compare-label">Location on {fmtDateShort(locationDate)}</h4>
        {segs.length ? (
          <ul className="plain-list">
            {segs.map((s, i) => (
              <li key={i} className="range-line">
                <Icon name="pin" size={14} /> {studioLabel(data.studios, s.studioId)} <span className="tabular muted">{fmtRange(s.start, s.end)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No allocated Jobs on this date, so not in any Studio.</p>
        )}
      </section>

      <section className="compare-sec">
        <h4 className="compare-label">Profile</h4>
        <ProfileView teacher={teacher} />
      </section>

      <Button variant="secondary" size="sm" icon="arrowRight" className="w-full" onClick={onUse}>Use in allocation form</Button>
    </article>
  );
}

function RuleChecklist({ checks }) {
  return (
    <ol className="rule-list">
      {checks.map((c) => (
        <li key={c.id} className={`rule ${c.passed ? 'rule-pass' : 'rule-fail'}`}>
          <Icon name={c.passed ? 'checkCircle' : 'xCircle'} size={18} />
          <div>
            <p className="rule-title">
              <span className="rule-fr tabular">{c.fr}</span> {c.label} — <strong>{c.passed ? 'Passed' : 'Failed'}</strong>
            </p>
            <p className="rule-msg">{c.message}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function JobAllocation() {
  const { data, allocateJob } = useStore();
  const toast = useToast();
  const weeks = selectableWeeks();
  const [week, setWeek] = useState(CURRENT_WEEK_START);
  const [compareIds, setCompareIds] = useState([]);
  const [compareMsg, setCompareMsg] = useState(null);
  const [locationDate, setLocationDate] = useState(firstDay(CURRENT_WEEK_START));
  const [form, setForm] = useState(emptyForm(firstDay(CURRENT_WEEK_START)));
  const [errors, setErrors] = useState({});
  const [outcome, setOutcome] = useState(null);
  const [filters, setFilters] = useState({ day: firstDay(CURRENT_WEEK_START), studio: 'ALL', teacher: 'ALL', status: 'ALL' });
  const [lastJobId, setLastJobId] = useState(null);
  const resultRef = useRef(null);
  const formRef = useRef(null);

  const teachers = useMemo(() => [...data.teachers].sort((a, b) => a.name.localeCompare(b.name)), [data.teachers]);
  const teacherName = (id) => teachers.find((t) => t.id === id)?.name ?? '—';
  const days = weekDates(week);

  useEffect(() => {
    const d = firstDay(week);
    setForm(emptyForm(d));
    setLocationDate(d);
    setFilters((f) => ({ ...f, day: d }));
    setOutcome(null);
    setErrors({});
  }, [week]);

  const unallocated = data.jobs.filter((j) => j.status === JOB_STATUS.UNALLOCATED && inWeek(j.date, week)).sort(byDateTime);

  const toggleCompare = (id) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter((x) => x !== id));
      setCompareMsg(null);
    } else if (compareIds.length >= MAX_COMPARE) {
      setCompareMsg(`You can compare up to ${MAX_COMPARE} Teachers. Remove one before adding ${teacherName(id)}.`);
    } else {
      setCompareIds([...compareIds, id]);
      setCompareMsg(null);
    }
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const loadJob = (jobId) => {
    if (!jobId) {
      setForm((f) => ({ ...f, jobId: '' }));
      return;
    }
    const j = data.jobs.find((x) => x.id === jobId);
    setForm((f) => ({ ...f, jobId, date: j.date, start: String(j.start), instrument: j.instrument, studioId: j.studioId }));
    setOutcome(null);
    setErrors({});
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const chooseTeacher = (id) => {
    setField('teacherId', id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = (e) => {
    e.preventDefault();
    const req = {};
    if (!form.date) req.date = 'Select the Job date.';
    if (form.start === '') req.start = 'Select the start time.';
    if (!form.instrument) req.instrument = 'Select the Instrument.';
    if (!form.teacherId) req.teacherId = 'Select a Teacher.';
    if (!form.studioId) req.studioId = 'Select a Studio.';
    setErrors(req);
    if (Object.keys(req).length) {
      setOutcome(null);
      return;
    }
    const draft = { ...form, start: Number(form.start) };
    const res = allocateJob(draft, week);
    if (res.error) {
      toast('danger', res.error);
      return;
    }
    setOutcome({ ...res, draft });
    if (res.ok) {
      setLastJobId(res.job.id);
      setForm((f) => ({ ...f, jobId: '' }));
      setFilters((f) => ({ ...f, day: res.job.date }));
      toast('success', `Job ${res.job.id} allocated to ${teacherName(res.job.teacherId)}.`);
    } else {
      toast('danger', `Allocation rejected: ${res.result.failures.length} rule${res.result.failures.length === 1 ? '' : 's'} broken.`);
    }
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  const weekJobs = data.jobs
    .filter((j) => inWeek(j.date, week))
    .filter((j) => filters.day === 'ALL' || j.date === filters.day)
    .filter((j) => filters.studio === 'ALL' || j.studioId === filters.studio)
    .filter((j) => filters.teacher === 'ALL' || j.teacherId === filters.teacher)
    .filter((j) => filters.status === 'ALL' || j.status === filters.status)
    .sort((a, b) => byDateTime(a, b) || a.studioId.localeCompare(b.studioId));

  const holidayOn = (d) => data.holidays.find((h) => h.date === d);

  return (
    <>
      <PageHeader
        title="Job Allocation"
        description="Allocate Jobs for one week at a time. Compare up to three Teachers, enter the Job details, then submit. Every allocation is checked against the eight allocation rules; you make the final decision."
      />

      {/* Step 1: week */}
      <Card title="1. Select week" subtitle={`Allocating for: ${fmtWeek(week)}`}>
        <div className="week-picker" role="radiogroup" aria-label="Allocation week">
          {weeks.map((w) => {
            const count = data.teachers.reduce((s, t) => s + teacherJobsInWeek(data.jobs, t.id, w).length, 0);
            return (
              <button key={w} type="button" role="radio" aria-checked={week === w} className={`week-chip ${week === w ? 'active' : ''}`} onClick={() => setWeek(w)}>
                <span className="week-chip-label">{w === CURRENT_WEEK_START ? 'This week' : `Week of ${fmtDateShort(w)}`}</span>
                <span className="week-chip-sub tabular">{count} allocated Job{count === 1 ? '' : 's'}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Step 2: compare */}
      <Card
        className="mt-4"
        title="2. Compare Teachers"
        subtitle={`Select up to ${MAX_COMPARE} Teachers · ${compareIds.length} of ${MAX_COMPARE} selected`}
        actions={compareIds.length > 0 && <Button size="sm" variant="ghost" icon="x" onClick={() => { setCompareIds([]); setCompareMsg(null); }}>Clear</Button>}
      >
        <div className="chip-row" aria-label="Teachers to compare">
          {teachers.map((t) => {
            const on = compareIds.includes(t.id);
            const hrs = weeklyHours(data.jobs, t.id, week);
            return (
              <button key={t.id} type="button" className={`toggle-chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggleCompare(t.id)}>
                {on && <Icon name="check" size={14} />}
                <span>{t.name}</span>
                <span className="chip-hours tabular">{fmtHours(hrs)}</span>
              </button>
            );
          })}
        </div>
        {compareMsg && <Alert tone="warning" className="mt-3">{compareMsg}</Alert>}

        {compareIds.length > 0 ? (
          <>
            <div className="location-picker">
              <Field label="Location on date">
                {(p) => (
                  <select {...p} className="input" value={locationDate} onChange={(e) => setLocationDate(e.target.value)}>
                    {days.map((d) => <option key={d} value={d}>{fmtDate(d)}{holidayOn(d) ? ' (public holiday)' : ''}</option>)}
                  </select>
                )}
              </Field>
            </div>
            <div className={`compare-grid cols-${compareIds.length}`}>
              {compareIds.map((id) => {
                const t = teachers.find((x) => x.id === id);
                return t ? (
                  <CompareCard key={id} teacher={t} week={week} locationDate={locationDate} data={data} onRemove={() => toggleCompare(id)} onUse={() => chooseTeacher(id)} />
                ) : null;
              })}
            </div>
          </>
        ) : (
          <EmptyState icon="users" title="No Teachers selected">
            Select up to three Teachers above to compare their Availability, Workload, Job Preference, Location and Profile for this week.
          </EmptyState>
        )}
      </Card>

      {/* Step 3: allocate */}
      <div className="grid-alloc mt-4">
        <div ref={formRef} className="scroll-target">
          <Card title="3. Job details and allocation" subtitle={`Job length is fixed at ${JOB_MINUTES} minutes`}>
            <form onSubmit={submit} noValidate className="stack">
              <Field label="Job" hint={unallocated.length ? `${unallocated.length} Unallocated Job${unallocated.length === 1 ? '' : 's'} in this week` : 'No Unallocated Jobs in this week'}>
                {(p) => (
                  <select {...p} className="input" value={form.jobId} onChange={(e) => loadJob(e.target.value)}>
                    <option value="">New Job</option>
                    {unallocated.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.id} · Unallocated · {fmtDateShort(j.date)} {fmtTime(j.start)} · {j.instrument} · {studioLabel(data.studios, j.studioId)}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <div className="form-row">
                <Field label="Date" error={errors.date} required>
                  {(p) => (
                    <select {...p} className="input" value={form.date} onChange={(e) => setField('date', e.target.value)}>
                      {days.map((d) => (
                        <option key={d} value={d} disabled={d < DEMO_TODAY}>
                          {fmtDate(d)}{holidayOn(d) ? ' (public holiday)' : ''}{d < DEMO_TODAY ? ' (past)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Start time" error={errors.start} hint={form.start !== '' ? `Ends ${fmtTime(Number(form.start) + JOB_MINUTES)}` : undefined} required>
                  {(p) => (
                    <select {...p} className="input" value={form.start} onChange={(e) => setField('start', e.target.value)}>
                      <option value="">Select time</option>
                      {TIMES.map((m) => <option key={m} value={m}>{fmtTime(m)}</option>)}
                    </select>
                  )}
                </Field>
              </div>
              <div className="form-row">
                <Field label="Instrument" error={errors.instrument} required>
                  {(p) => (
                    <select {...p} className="input" value={form.instrument} onChange={(e) => setField('instrument', e.target.value)}>
                      <option value="">Select Instrument</option>
                      {data.instruments.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  )}
                </Field>
                <Field label="Studio" error={errors.studioId} required>
                  {(p) => (
                    <select {...p} className="input" value={form.studioId} onChange={(e) => setField('studioId', e.target.value)}>
                      <option value="">Select Studio</option>
                      {data.studios.map((s) => <option key={s.id} value={s.id}>{studioLabel(data.studios, s.id)}</option>)}
                    </select>
                  )}
                </Field>
              </div>
              <Field label="Teacher" error={errors.teacherId} required>
                {(p) => (
                  <select {...p} className="input" value={form.teacherId} onChange={(e) => setField('teacherId', e.target.value)}>
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {fmtHours(weeklyHours(data.jobs, t.id, week))} this week{compareIds.includes(t.id) ? ' · comparing' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <div className="btn-row">
                <Button type="submit" icon="allocate">Validate and allocate Job</Button>
                <Button variant="secondary" onClick={() => { setForm(emptyForm(firstDay(week))); setErrors({}); setOutcome(null); }}>Clear form</Button>
              </div>
            </form>
          </Card>
        </div>

        <div ref={resultRef} className="scroll-target" aria-live="polite">
          <Card title="Validation result">
            {!outcome && (
              <EmptyState icon="shield" title="No allocation submitted yet">
                When you submit, all eight allocation rules are checked. If any rule fails, the Job is not allocated and the broken rule is explained here.
              </EmptyState>
            )}
            {outcome && !outcome.ok && (
              <>
                <Alert tone="danger" title={`Allocation rejected — ${outcome.result.failures.length} rule${outcome.result.failures.length === 1 ? '' : 's'} broken`}>
                  <ul className="fail-list">
                    {outcome.result.failures.map((f) => (
                      <li key={f.id}>
                        <strong>{f.fr} · {f.label}:</strong> {f.message}
                      </li>
                    ))}
                  </ul>
                  <p className="small mt-2">Nothing was saved. Change the Job details or choose another Teacher or Studio, then submit again.</p>
                </Alert>
                <details className="mt-3" open>
                  <summary className="summary">All eight rule checks</summary>
                  <RuleChecklist checks={outcome.result.checks} />
                </details>
              </>
            )}
            {outcome && outcome.ok && (
              <>
                <Alert tone="success" title={`Job ${outcome.job.id} allocated`}>
                  {outcome.job.instrument} with <strong>{teacherName(outcome.job.teacherId)}</strong>, {fmtDateLong(outcome.job.date)},{' '}
                  <span className="tabular">{fmtRange(outcome.job.start, outcome.job.end)}</span>, {studioLabel(data.studios, outcome.job.studioId)}.
                  The Teacher's Jobs and Workload and the Studio schedule are updated.
                </Alert>
                <details className="mt-3">
                  <summary className="summary">All eight rule checks passed</summary>
                  <RuleChecklist checks={outcome.result.checks} />
                </details>
              </>
            )}
            {outcome && (
              <p className="muted small mt-3 tabular">
                Rules checked in {outcome.elapsedMs.toFixed(1)} ms in this browser (NFR-02 target: within 3 seconds).
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Schedule */}
      <Card className="mt-4" title="Jobs in the selected week" subtitle="Teacher and Studio schedules. Unallocated Jobs can be loaded into the form.">
        <div className="filters">
          <Field label="Day">
            {(p) => (
              <select {...p} className="input" value={filters.day} onChange={(e) => setFilters({ ...filters, day: e.target.value })}>
                <option value="ALL">All days</option>
                {days.map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}
              </select>
            )}
          </Field>
          <Field label="Studio">
            {(p) => (
              <select {...p} className="input" value={filters.studio} onChange={(e) => setFilters({ ...filters, studio: e.target.value })}>
                <option value="ALL">All Studios</option>
                {data.studios.map((s) => <option key={s.id} value={s.id}>{studioLabel(data.studios, s.id)}</option>)}
              </select>
            )}
          </Field>
          <Field label="Teacher">
            {(p) => (
              <select {...p} className="input" value={filters.teacher} onChange={(e) => setFilters({ ...filters, teacher: e.target.value })}>
                <option value="ALL">All Teachers</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </Field>
          <Field label="Status">
            {(p) => (
              <select {...p} className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="ALL">All statuses</option>
                <option value={JOB_STATUS.ALLOCATED}>Allocated</option>
                <option value={JOB_STATUS.UNALLOCATED}>Unallocated</option>
              </select>
            )}
          </Field>
        </div>
        <p className="muted small tabular mt-2" aria-live="polite">{weekJobs.length} Job{weekJobs.length === 1 ? '' : 's'} shown</p>
        {holidayOn(filters.day) && <Alert tone="info" className="mt-2">{fmtDate(filters.day)}: {holidayOn(filters.day).name}. The school is closed.</Alert>}
        {weekJobs.length ? (
          <div className="table-wrap table-scroll mt-2">
            <table className="table rtable">
              <thead>
                <tr>
                  <th scope="col">Job</th>
                  <th scope="col">Date</th>
                  <th scope="col">Time</th>
                  <th scope="col">Studio</th>
                  <th scope="col">Instrument</th>
                  <th scope="col">Teacher</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {weekJobs.map((j) => (
                  <tr key={j.id} className={j.id === lastJobId ? 'row-new' : j.status === JOB_STATUS.UNALLOCATED ? 'row-unalloc' : ''}>
                    <th scope="row" data-label="Job" className="tabular">
                      {j.id} {j.id === lastJobId && <Badge tone="info" icon="check">Just allocated</Badge>}
                    </th>
                    <td data-label="Date">{fmtDateShort(j.date)}</td>
                    <td data-label="Time" className="tabular">{fmtRange(j.start, j.end)}</td>
                    <td data-label="Studio">{studioLabel(data.studios, j.studioId)}</td>
                    <td data-label="Instrument">{j.instrument}</td>
                    <td data-label="Teacher">{j.teacherId ? teacherName(j.teacherId) : <span className="muted">—</span>}</td>
                    <td data-label="Status"><JobStatusBadge status={j.status} /></td>
                    <td data-label="Actions" className="actions-cell">
                      {j.status === JOB_STATUS.UNALLOCATED && j.date >= DEMO_TODAY && (
                        <Button size="sm" variant="secondary" icon="arrowRight" onClick={() => loadJob(j.id)}>Load into form</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="calendar" title="No Jobs match these filters" />
        )}
      </Card>
    </>
  );
}
