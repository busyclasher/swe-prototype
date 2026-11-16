// UC02 Record Job Preference - FR-09.
// A Job Preference for a selected week = preferred teaching times + requested teaching hours.

import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, DataList, EmptyState, Field, PageHeader, useToast } from '../../components/ui.jsx';
import { useStore } from '../../state/store.jsx';
import { CURRENT_WEEK_START, HORIZON_END } from '../../config.js';
import { addDays, dayShort, fmtDate, fmtDateShort, fmtRange, fmtTime, fmtWeek, timeOptions, weekDates } from '../../lib/time.js';

const TIMES = timeOptions(8 * 60, 21 * 60, 30);

/** Weeks the Teacher can plan for: current week to the week containing the one-month horizon. */
export function selectableWeeks() {
  const out = [];
  for (let w = CURRENT_WEEK_START; w <= HORIZON_END; w = addDays(w, 7)) out.push(w);
  return out;
}

export function PreferenceSummary({ pref, weekStartIso }) {
  return (
    <DataList
      items={[
        ['Requested teaching hours', <span className="tabular">{pref.requestedHours.toFixed(1)} h</span>],
        [
          'Preferred teaching times',
          <ul className="plain-list">
            {pref.slots.map((s, i) => (
              <li key={i} className="tabular">{fmtDateShort(addDays(weekStartIso, s.day))}: {fmtRange(s.start, s.end)}</li>
            ))}
          </ul>,
        ],
      ]}
    />
  );
}

const emptySlot = () => ({ day: '0', start: '', end: '' });

export default function JobPreferences() {
  const { data, session, saveJobPreference } = useStore();
  const toast = useToast();
  const weeks = selectableWeeks();
  const [week, setWeek] = useState(CURRENT_WEEK_START);
  const pref = data.preferences.find((p) => p.teacherId === session.teacherId && p.weekStart === week); // own only
  const [editing, setEditing] = useState(!pref);
  const [form, setForm] = useState({ requestedHours: '', slots: [emptySlot()] });
  const [errors, setErrors] = useState({});

  const loadForm = (p) =>
    setForm(
      p
        ? { requestedHours: String(p.requestedHours), slots: p.slots.map((s) => ({ day: String(s.day), start: String(s.start), end: String(s.end) })) }
        : { requestedHours: '', slots: [emptySlot()] },
    );

  useEffect(() => {
    setEditing(!pref);
    loadForm(pref);
    setErrors({});
  }, [week]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSlot = (i, key, value) => setForm((f) => ({ ...f, slots: f.slots.map((s, j) => (j === i ? { ...s, [key]: value } : s)) }));
  const addSlot = () => setForm((f) => ({ ...f, slots: [...f.slots, emptySlot()] }));
  const removeSlot = (i) => setForm((f) => ({ ...f, slots: f.slots.filter((_, j) => j !== i) }));

  const save = (e) => {
    e.preventDefault();
    const missing = form.slots.map((s) => (s.start === '' || s.end === '' ? 'Select both a start and an end time.' : null));
    if (missing.some(Boolean)) {
      setErrors({ slotRows: missing });
      return;
    }
    const res = saveJobPreference({ weekStart: week, slots: form.slots, requestedHours: form.requestedHours });
    if (!res.ok) {
      setErrors(res.errors || {});
      if (res.error) toast('danger', res.error);
      return;
    }
    setErrors({});
    setEditing(false);
    toast('success', `Job Preference ${res.updated ? 'updated' : 'saved'} for the week of ${fmtWeek(week)}.`);
  };

  const days = weekDates(week);

  return (
    <>
      <PageHeader title="Job Preferences" description="Tell your Manager when you would prefer to teach and how many hours you would like, one week at a time." />

      <Card title="Select week">
        <div className="week-picker" role="radiogroup" aria-label="Week">
          {weeks.map((w) => {
            const has = data.preferences.some((p) => p.teacherId === session.teacherId && p.weekStart === w);
            return (
              <button key={w} type="button" role="radio" aria-checked={week === w} className={`week-chip ${week === w ? 'active' : ''}`} onClick={() => setWeek(w)}>
                <span className="week-chip-label">{w === CURRENT_WEEK_START ? 'This week' : `Week of ${fmtDateShort(w)}`}</span>
                <span className="week-chip-sub">{has ? <><span aria-hidden="true">✓</span> Recorded</> : 'Not recorded'}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card
        className="mt-4"
        title={`Week of ${fmtWeek(week)}`}
        subtitle={pref ? `Last saved ${fmtDate(pref.savedOn)}` : 'No Job Preference recorded for this week yet'}
        actions={pref ? (editing ? <Badge tone="info" icon="edit">Editing</Badge> : <Badge tone="success">Saved</Badge>) : <Badge tone="neutral" icon="info">Not recorded</Badge>}
      >
        {!editing && pref && (
          <>
            <PreferenceSummary pref={pref} weekStartIso={week} />
            <div className="btn-row mt-4">
              <Button variant="secondary" icon="edit" onClick={() => { loadForm(pref); setEditing(true); }}>Edit Job Preference</Button>
            </div>
          </>
        )}

        {editing && (
          <form onSubmit={save} noValidate className="stack">
            {!pref && (
              <EmptyState icon="sliders" title="Record your Job Preference">
                Add the days and times you would prefer to teach in this week and the total hours you would like.
              </EmptyState>
            )}
            <fieldset className="fieldset">
              <legend className="field-label">Preferred teaching times <span className="req" aria-hidden="true">*</span></legend>
              {errors.slots && <p className="field-error">{errors.slots}</p>}
              <ul className="slot-list">
                {form.slots.map((s, i) => (
                  <li key={i} className="slot-row">
                    <Field label="Day" className="slot-day">
                      {(p) => (
                        <select {...p} className="input" value={s.day} onChange={(e) => setSlot(i, 'day', e.target.value)}>
                          {days.map((d, idx) => <option key={d} value={idx}>{fmtDateShort(d)}</option>)}
                        </select>
                      )}
                    </Field>
                    <Field label="From">
                      {(p) => (
                        <select {...p} className="input" value={s.start} onChange={(e) => setSlot(i, 'start', e.target.value)}>
                          <option value="">Select</option>
                          {TIMES.map((m) => <option key={m} value={m}>{fmtTime(m)}</option>)}
                        </select>
                      )}
                    </Field>
                    <Field label="To">
                      {(p) => (
                        <select {...p} className="input" value={s.end} onChange={(e) => setSlot(i, 'end', e.target.value)}>
                          <option value="">Select</option>
                          {TIMES.map((m) => <option key={m} value={m}>{fmtTime(m)}</option>)}
                        </select>
                      )}
                    </Field>
                    <Button variant="ghost" icon="trash" className="slot-remove" onClick={() => removeSlot(i)} disabled={form.slots.length === 1} aria-label={`Remove preferred time ${i + 1}`} />
                    {errors.slotRows?.[i] && <p className="field-error slot-error">{errors.slotRows[i]}</p>}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" size="sm" icon="plus" onClick={addSlot}>Add preferred time</Button>
            </fieldset>

            <Field label="Requested teaching hours for this week" error={errors.requestedHours} hint="Whole or half hours, e.g. 12 or 12.5. Each Job is 30 minutes." required className="max-w-xs">
              {(p) => (
                <input {...p} type="number" inputMode="decimal" min="0.5" max="60" step="0.5" className="input" value={form.requestedHours} onChange={(e) => setForm({ ...form, requestedHours: e.target.value })} />
              )}
            </Field>

            {Object.keys(errors).length > 0 && <Alert tone="danger">Please correct the highlighted fields.</Alert>}
            <div className="btn-row">
              <Button type="submit" icon="check">Save Job Preference</Button>
              {pref && <Button variant="secondary" onClick={() => { loadForm(pref); setErrors({}); setEditing(false); }}>Cancel</Button>}
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
