// UC01 Submit Availability - FR-07 (add), FR-08 (edit), FR-10 (late marking).

import { useState } from 'react';
import { Alert, Badge, Button, Card, EmptyState, Field, PageHeader, useToast } from '../../components/ui.jsx';
import MonthCalendar from '../../components/MonthCalendar.jsx';
import { useStore } from '../../state/store.jsx';
import { AVAILABILITY_DEADLINE_DAY, DEMO_TODAY, HORIZON_END } from '../../config.js';
import { deadlineFor, isLateSubmission, isWithinHorizon } from '../../lib/availability.js';
import { addMonths, fmtDate, fmtDateLong, fmtRange, fmtTime, monthKey, monthLabel, timeOptions } from '../../lib/time.js';

const TIMES = timeOptions(6 * 60, 23 * 60, 30);

export function LateBadge({ record }) {
  return record.late ? (
    <Badge tone="warning" icon="alert">Late</Badge>
  ) : (
    <Badge tone="success">On time</Badge>
  );
}

export default function TeacherAvailability() {
  const { data, session, addAvailability, updateAvailability } = useStore();
  const toast = useToast();
  const [month, setMonth] = useState(monthKey(DEMO_TODAY));
  const [date, setDate] = useState(DEMO_TODAY);
  const [editing, setEditing] = useState(null); // record id
  const [form, setForm] = useState({ start: '', end: '' });
  const [errors, setErrors] = useState({});

  const mine = data.availability.filter((a) => a.teacherId === session.teacherId); // own data only (NFR-10)
  const onDate = mine.filter((a) => a.date === date).sort((a, b) => a.start - b.start);
  const holiday = data.holidays.find((h) => h.date === date);
  const nextMonth = monthKey(addMonths(`${monthKey(DEMO_TODAY)}-01`, 1));
  const pastDeadline = Number(DEMO_TODAY.slice(8)) > AVAILABILITY_DEADLINE_DAY;
  const willBeLate = isLateSubmission(date, DEMO_TODAY);

  const pickDate = (d) => {
    setDate(d);
    setEditing(null);
    setForm({ start: '', end: '' });
    setErrors({});
  };

  const startEdit = (rec) => {
    setEditing(rec.id);
    setForm({ start: String(rec.start), end: String(rec.end) });
    setErrors({});
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ start: '', end: '' });
    setErrors({});
  };

  const save = (e) => {
    e.preventDefault();
    const payload = { date, start: form.start === '' ? '' : Number(form.start), end: form.end === '' ? '' : Number(form.end) };
    const res = editing ? updateAvailability(editing, payload) : addAvailability(payload);
    if (!res.ok) {
      setErrors(res.errors || {});
      if (res.error) toast('danger', res.error);
      return;
    }
    const r = res.record;
    toast(
      r.late ? 'warning' : 'success',
      `Availability ${editing ? 'updated' : 'saved'}: ${fmtDate(r.date)}, ${fmtRange(r.start, r.end)}${r.late ? ' — marked Late (submitted after the deadline).' : '.'}`,
    );
    cancelEdit();
  };

  return (
    <>
      <PageHeader
        title="My Availability"
        description={`Add or edit the times you are available to teach, for any date from ${fmtDate(DEMO_TODAY)} to ${fmtDate(HORIZON_END)} (up to one month ahead).`}
      />

      <Alert tone={pastDeadline ? 'warning' : 'info'} title={`Submission deadline for ${monthLabel(nextMonth)}`}>
        Availability for {monthLabel(nextMonth)} was due by <strong>{fmtDate(deadlineFor(`${nextMonth}-01`))}</strong>.
        {pastDeadline
          ? ` Today is ${fmtDate(DEMO_TODAY)}, so any ${monthLabel(nextMonth)} Availability you add or edit now is marked Late.`
          : ' Submit before the deadline to avoid a Late mark.'}
      </Alert>

      <div className="split mt-4">
        <Card title="Calendar" subtitle="Select a date to view, add or edit Availability">
          <MonthCalendar
            month={month}
            minMonth={monthKey(DEMO_TODAY)}
            maxMonth={monthKey(HORIZON_END)}
            onMonthChange={setMonth}
            selected={date}
            onSelect={pickDate}
            selectable={isWithinHorizon}
            info={(d) => {
              const recs = mine.filter((a) => a.date === d);
              return { count: recs.length, late: recs.some((a) => a.late), holiday: data.holidays.find((h) => h.date === d)?.name };
            }}
          />
          <ul className="legend" aria-label="Calendar legend">
            <li><span className="legend-swatch swatch-avail" aria-hidden="true" /> ✓ n = Availability entries</li>
            <li><span className="legend-swatch swatch-late" aria-hidden="true" /> “Late” = submitted after the deadline</li>
            <li><span className="legend-swatch swatch-off" aria-hidden="true" /> Greyed dates are outside the one-month range</li>
          </ul>
        </Card>

        <div className="split-side stack">
          <Card title={fmtDateLong(date)} subtitle="Saved Availability for this date">
            {holiday && (
              <Alert tone="info" className="mb-3">{holiday.name}: the school is closed, so no Jobs can be allocated on this date.</Alert>
            )}
            {onDate.length ? (
              <ul className="avail-list">
                {onDate.map((a) => (
                  <li key={a.id} className={`avail-item ${editing === a.id ? 'editing' : ''}`}>
                    <div>
                      <span className="avail-time tabular">{fmtRange(a.start, a.end)}</span>
                      <span className="avail-meta">
                        <LateBadge record={a} />
                        <span className="muted small">Submitted {fmtDate(a.submittedOn)}</span>
                        {a.savedThisSession && <Badge tone="info" icon="check">Saved just now</Badge>}
                      </span>
                    </div>
                    <Button variant="secondary" size="sm" icon="edit" onClick={() => startEdit(a)} disabled={editing === a.id} aria-label={`Edit Availability ${fmtRange(a.start, a.end)}`}>
                      {editing === a.id ? 'Editing' : 'Edit'}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="calendar" title="No Availability saved for this date">Use the form below to add a time range.</EmptyState>
            )}
          </Card>

          <Card title={editing ? 'Edit Availability' : 'Add Availability'} subtitle={editing ? 'Change the times and save' : 'New time range for the selected date'} className={editing ? 'card-editing' : 'card-new'}>
            <form onSubmit={save} noValidate className="stack">
              <p className="small"><strong>Date:</strong> {fmtDateLong(date)}</p>
              <div className="form-row">
                <Field label="From" error={errors.start} required>
                  {(p) => (
                    <select {...p} className="input" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}>
                      <option value="">Select time</option>
                      {TIMES.map((m) => <option key={m} value={m}>{fmtTime(m)}</option>)}
                    </select>
                  )}
                </Field>
                <Field label="To" error={errors.end} required>
                  {(p) => (
                    <select {...p} className="input" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}>
                      <option value="">Select time</option>
                      {TIMES.map((m) => <option key={m} value={m}>{fmtTime(m)}</option>)}
                    </select>
                  )}
                </Field>
              </div>
              {errors.date && <Alert tone="danger">{errors.date}</Alert>}
              {willBeLate && (
                <Alert tone="warning">
                  This date is in {monthLabel(monthKey(date))}. Saving now marks it <strong>Late</strong> because the deadline ({fmtDate(deadlineFor(date))}) has passed.
                </Alert>
              )}
              <div className="btn-row">
                <Button type="submit" icon="check">{editing ? 'Save changes' : 'Save Availability'}</Button>
                {editing && <Button variant="secondary" onClick={cancelEdit}>Cancel</Button>}
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
