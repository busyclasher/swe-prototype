// UC06 Update Teacher Profile - FR-11. Manager-only (route + action guarded).
// Profile = qualified Instruments, areas of expertise, years of teaching experience.

import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, DataList, EmptyState, Field, PageHeader, useToast } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import { useStore } from '../../state/store.jsx';

export function ProfileView({ teacher }) {
  const p = teacher.profile;
  return (
    <DataList
      items={[
        ['Qualified Instruments', p.instruments.length ? <span className="tag-list">{p.instruments.map((i) => <span key={i} className="tag">{i}</span>)}</span> : <span className="muted">None recorded</span>],
        ['Areas of expertise', p.expertise.length ? p.expertise.join('; ') : <span className="muted">None recorded</span>],
        ['Years of teaching experience', <span className="tabular">{p.yearsExperience}</span>],
      ]}
    />
  );
}

export default function TeacherProfiles({ query }) {
  const { data, updateTeacherProfile } = useStore();
  const toast = useToast();
  const teachers = [...data.teachers].sort((a, b) => a.name.localeCompare(b.name));
  const [selectedId, setSelectedId] = useState(query.teacher || teachers[0]?.id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [newExpertise, setNewExpertise] = useState('');
  const [errors, setErrors] = useState({});
  const teacher = teachers.find((t) => t.id === selectedId);

  useEffect(() => {
    if (query.teacher) setSelectedId(query.teacher);
  }, [query.teacher]);

  useEffect(() => {
    setEditing(false);
    setErrors({});
  }, [selectedId]);

  const startEdit = () => {
    setForm({
      instruments: [...teacher.profile.instruments],
      expertise: [...teacher.profile.expertise],
      yearsExperience: String(teacher.profile.yearsExperience),
    });
    setNewExpertise('');
    setErrors({});
    setEditing(true);
  };

  const toggleInstrument = (inst) =>
    setForm((f) => ({ ...f, instruments: f.instruments.includes(inst) ? f.instruments.filter((i) => i !== inst) : [...f.instruments, inst] }));

  const addExpertise = () => {
    const v = newExpertise.trim();
    if (!v) {
      setErrors((e) => ({ ...e, expertise: 'Type an area of expertise first.' }));
      return;
    }
    if (form.expertise.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setErrors((e) => ({ ...e, expertise: 'This area of expertise is already listed.' }));
      return;
    }
    setForm((f) => ({ ...f, expertise: [...f.expertise, v] }));
    setNewExpertise('');
    setErrors((e) => ({ ...e, expertise: undefined }));
  };

  const save = (e) => {
    e.preventDefault();
    const ordered = data.instruments.filter((i) => form.instruments.includes(i));
    const res = updateTeacherProfile(teacher.id, { ...form, instruments: ordered });
    if (!res.ok) {
      setErrors(res.errors || {});
      if (res.error) toast('danger', res.error);
      return;
    }
    setEditing(false);
    toast('success', `Profile updated for ${teacher.name}.`);
  };

  return (
    <>
      <PageHeader title="Teacher Profiles" description="Select a Teacher to view and update their qualified Instruments, areas of expertise and years of teaching experience." />
      <div className="split split-left">
        <Card title="Teachers" className="list-card">
          <ul className="select-list">
            {teachers.map((t) => (
              <li key={t.id}>
                <button type="button" className={`select-item ${t.id === selectedId ? 'active' : ''}`} aria-pressed={t.id === selectedId} onClick={() => setSelectedId(t.id)}>
                  <span className="select-item-name">{t.name}</span>
                  <span className="muted small">{t.profile.instruments.join(', ') || 'No Instruments recorded'}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="split-main">
          {!teacher ? (
            <Card><EmptyState title="Select a Teacher" /></Card>
          ) : (
            <Card
              title={teacher.name}
              subtitle={teacher.email}
              actions={editing ? <Badge tone="info" icon="edit">Editing</Badge> : <Button variant="secondary" icon="edit" onClick={startEdit}>Edit Profile</Button>}
            >
              {!teacher.profile.instruments.length && !editing && (
                <Alert tone="warning" className="mb-3">This Teacher has no qualified Instruments recorded, so Jobs cannot be allocated to them yet (FR-26).</Alert>
              )}
              {!editing && <ProfileView teacher={teacher} />}
              {editing && (
                <form onSubmit={save} noValidate className="stack">
                  <fieldset className="fieldset">
                    <legend className="field-label">Qualified Instruments <span className="req" aria-hidden="true">*</span></legend>
                    <div className="check-grid">
                      {data.instruments.map((inst) => (
                        <label key={inst} className={`check-chip ${form.instruments.includes(inst) ? 'checked' : ''}`}>
                          <input type="checkbox" checked={form.instruments.includes(inst)} onChange={() => toggleInstrument(inst)} />
                          <span>{inst}</span>
                        </label>
                      ))}
                    </div>
                    {errors.instruments && <p className="field-error"><Icon name="xCircle" size={14} /> {errors.instruments}</p>}
                  </fieldset>

                  <fieldset className="fieldset">
                    <legend className="field-label">Areas of expertise</legend>
                    {form.expertise.length ? (
                      <ul className="tag-list">
                        {form.expertise.map((x) => (
                          <li key={x} className="tag tag-removable">
                            {x}
                            <button type="button" className="tag-x" aria-label={`Remove ${x}`} onClick={() => setForm((f) => ({ ...f, expertise: f.expertise.filter((y) => y !== x) }))}>
                              <Icon name="x" size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted small">No areas of expertise listed.</p>
                    )}
                    <div className="inline-add">
                      <Field label="Add an area of expertise" error={errors.expertise} className="grow">
                        {(p) => (
                          <input {...p} className="input" value={newExpertise} placeholder="e.g. Jazz improvisation"
                            onChange={(e) => setNewExpertise(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExpertise(); } }} />
                        )}
                      </Field>
                      <Button variant="secondary" icon="plus" onClick={addExpertise}>Add</Button>
                    </div>
                  </fieldset>

                  <Field label="Years of teaching experience" error={errors.yearsExperience} required className="max-w-xs">
                    {(p) => <input {...p} type="number" min="0" max="60" step="1" inputMode="numeric" className="input" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} />}
                  </Field>

                  <div className="btn-row">
                    <Button type="submit" icon="check">Save Profile</Button>
                    <Button variant="secondary" onClick={() => { setEditing(false); setErrors({}); }}>Cancel</Button>
                  </div>
                </form>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
