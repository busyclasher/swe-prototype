// FR-04: Manager views each Teacher's Availability for any date up to one month ahead.
// View-only: Managers cannot edit Teacher Availability.

import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, EmptyState, Field, PageHeader } from '../../components/ui.jsx';
import { LateBadge } from '../teacher/TeacherAvailability.jsx';
import { useStore } from '../../state/store.jsx';
import { DEMO_TODAY, HORIZON_END } from '../../config.js';
import { isWithinHorizon } from '../../lib/availability.js';
import { addDays, fmtDate, fmtDateLong, fmtDateShort, fmtRange, weekDates, weekStart } from '../../lib/time.js';

const ALL = 'ALL';

function Ranges({ records }) {
  if (!records.length) return <span className="muted">No Availability</span>;
  return (
    <ul className="plain-list">
      {records.map((a) => (
        <li key={a.id} className="range-line">
          <span className="tabular">{fmtRange(a.start, a.end)}</span> <LateBadge record={a} />
        </li>
      ))}
    </ul>
  );
}

export default function ManagerAvailability({ query }) {
  const { data } = useStore();
  const [teacherId, setTeacherId] = useState(query.teacher || ALL);
  const [date, setDate] = useState(DEMO_TODAY);
  const [dateError, setDateError] = useState(null);

  useEffect(() => {
    if (query.teacher) setTeacherId(query.teacher);
  }, [query.teacher]);

  const teachers = [...data.teachers].sort((a, b) => a.name.localeCompare(b.name));
  const recordsFor = (tid, d) => data.availability.filter((a) => a.teacherId === tid && a.date === d).sort((a, b) => a.start - b.start);
  const holiday = data.holidays.find((h) => h.date === date);
  const teacher = teachers.find((t) => t.id === teacherId);

  const changeDate = (value) => {
    if (!value) return;
    if (!isWithinHorizon(value)) {
      setDateError(`Choose a date from ${fmtDate(DEMO_TODAY)} to ${fmtDate(HORIZON_END)}.`);
      return;
    }
    setDateError(null);
    setDate(value);
  };

  return (
    <>
      <PageHeader
        title="Teacher Availability"
        description={`View any Teacher's Availability for dates from ${fmtDate(DEMO_TODAY)} to ${fmtDate(HORIZON_END)} (up to one month ahead). Availability is maintained by each Teacher.`}
      />

      <Card>
        <div className="filters">
          <Field label="Teacher">
            {(p) => (
              <select {...p} className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value={ALL}>All Teachers</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </Field>
          <Field label="Date" error={dateError} hint="Up to one month ahead">
            {(p) => <input {...p} type="date" className="input" min={DEMO_TODAY} max={HORIZON_END} value={date} onChange={(e) => changeDate(e.target.value)} />}
          </Field>
          <div className="filters-buttons">
            <Button variant="secondary" icon="chevronLeft" onClick={() => changeDate(addDays(date, -1))} disabled={date <= DEMO_TODAY} aria-label="Previous day">Prev</Button>
            <Button variant="secondary" onClick={() => changeDate(addDays(date, 1))} disabled={date >= HORIZON_END} aria-label="Next day">
              Next
            </Button>
          </div>
        </div>
      </Card>

      {holiday && <Alert tone="info" className="mt-4">{fmtDate(date)} is a public holiday ({holiday.name}). The school is closed.</Alert>}

      {teacherId === ALL ? (
        <Card title={fmtDateLong(date)} subtitle="Availability of every Teacher on this date" className="mt-4">
          <div className="table-wrap">
            <table className="table rtable">
              <thead>
                <tr>
                  <th scope="col">Teacher</th>
                  <th scope="col">Availability</th>
                  <th scope="col">Submitted</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => {
                  const recs = recordsFor(t.id, date);
                  return (
                    <tr key={t.id}>
                      <th scope="row" data-label="Teacher">{t.name}</th>
                      <td data-label="Availability"><Ranges records={recs} /></td>
                      <td data-label="Submitted">{recs.length ? [...new Set(recs.map((r) => fmtDate(r.submittedOn)))].join(', ') : '—'}</td>
                      <td data-label="Actions" className="actions-cell">
                        <Button size="sm" variant="ghost" icon="calendar" onClick={() => setTeacherId(t.id)}>Week view</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : teacher ? (
        <Card title={`${teacher.name} – week of ${fmtDateShort(weekStart(date))}`} subtitle={`Selected date: ${fmtDateLong(date)}`} className="mt-4"
          actions={<Button size="sm" variant="ghost" icon="users" onClick={() => setTeacherId(ALL)}>All Teachers</Button>}>
          <ul className="week-avail">
            {weekDates(weekStart(date)).map((d) => {
              const inRange = isWithinHorizon(d);
              const hol = data.holidays.find((h) => h.date === d);
              return (
                <li key={d} className={`week-avail-day ${d === date ? 'selected' : ''} ${inRange ? '' : 'out'}`}>
                  <button type="button" className="week-avail-date" onClick={() => inRange && changeDate(d)} disabled={!inRange} aria-pressed={d === date}>
                    {fmtDateShort(d)}
                  </button>
                  <div>
                    {hol && <Badge tone="info" icon="info">Public holiday</Badge>}
                    {inRange ? <Ranges records={recordsFor(teacher.id, d)} /> : <span className="muted small">Outside viewing range</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <EmptyState title="Teacher not found" />
      )}
    </>
  );
}
