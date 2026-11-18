// FR-31: IT Administrator creates a Teacher or Manager account and assigns the role.
// IT Administrator is deliberately NOT a creatable role.

import { useState } from 'react';
import { Alert, Badge, Button, Card, DataList, Field, PageHeader, useToast } from '../../components/ui.jsx';
import { useStore } from '../../state/store.jsx';
import { CREATABLE_ROLES, ROLE_LABELS } from '../../lib/roles.js';

const EMPTY = { name: '', username: '', email: '', role: '', password: '', confirmPassword: '' };

export default function AccountManagement() {
  const { data, createAccount } = useStore();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const res = createAccount(form);
    if (!res.ok) {
      setErrors(res.errors || {});
      setCreated(null);
      if (res.error) toast('danger', res.error);
      return;
    }
    setErrors({});
    setCreated(res.account);
    setForm(EMPTY);
    toast('success', `${ROLE_LABELS[res.account.role]} account created for ${res.account.name}.`);
  };

  const accounts = [...data.accounts].sort((a, b) => Number(b.createdInDemo) - Number(a.createdInDemo) || a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader title="Account Management" description="Create Teacher and Manager accounts and assign their role." />
      <div className="split split-form">
        <Card title="Create account" subtitle="All fields are required">
          {created && (
            <Alert tone="success" title="Account created" className="mb-3">
              <DataList
                items={[
                  ['Name', created.name],
                  ['Role', ROLE_LABELS[created.role]],
                  ['Username', <code>{created.username}</code>],
                ]}
              />
              <p className="small mt-2">
                This account can sign in to the demo now (use Log out, then sign in with the username and password you set).
                {created.role === 'TEACHER' && ' A Teacher Profile was created with no Instruments; a Manager can complete it on the Teacher Profiles page.'}
              </p>
            </Alert>
          )}
          {Object.keys(errors).length > 0 && <Alert tone="danger" className="mb-3">The account was not created. Please correct the highlighted fields.</Alert>}
          <form onSubmit={submit} noValidate className="stack">
            <Field label="Full name" error={errors.name} required>
              {(p) => <input {...p} className="input" autoComplete="off" value={form.name} onChange={set('name')} />}
            </Field>
            <div className="form-row">
              <Field label="Username" error={errors.username} hint="Lowercase letters, numbers, dots, hyphens, underscores" required>
                {(p) => <input {...p} className="input" autoComplete="off" autoCapitalize="none" value={form.username} onChange={set('username')} />}
              </Field>
              <Field label="Email" error={errors.email} required>
                {(p) => <input {...p} type="email" className="input" autoComplete="off" value={form.email} onChange={set('email')} />}
              </Field>
            </div>
            <fieldset className="fieldset" aria-describedby={errors.role ? 'role-err' : undefined}>
              <legend className="field-label">Role <span className="req" aria-hidden="true">*</span></legend>
              <div className="radio-row">
                {CREATABLE_ROLES.map((r) => (
                  <label key={r} className={`radio-card ${form.role === r ? 'checked' : ''}`}>
                    <input type="radio" name="role" value={r} checked={form.role === r} onChange={set('role')} />
                    <span>
                      <span className="radio-title">{ROLE_LABELS[r]}</span>
                      <span className="muted small">
                        {r === 'TEACHER' ? 'Views own Jobs and Workload, submits Availability and Job Preferences, can reject Jobs.' : 'Monitors Workload, updates Teacher Profiles, allocates Jobs.'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {errors.role && <p id="role-err" className="field-error">{errors.role}</p>}
            </fieldset>
            <div className="form-row">
              <Field label="Password" error={errors.password} hint="At least 8 characters" required>
                {(p) => <input {...p} type="password" className="input" autoComplete="new-password" value={form.password} onChange={set('password')} />}
              </Field>
              <Field label="Confirm password" error={errors.confirmPassword} required>
                {(p) => <input {...p} type="password" className="input" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} />}
              </Field>
            </div>
            <p className="muted small">Prototype only: passwords are held in browser memory for the demo. Production must store salted hashes only (NFR-11).</p>
            <div className="btn-row">
              <Button type="submit" icon="userPlus">Create account</Button>
              <Button variant="secondary" onClick={() => { setForm(EMPTY); setErrors({}); }}>Clear</Button>
            </div>
          </form>
        </Card>

        <Card title="Accounts" subtitle={`${data.accounts.length} accounts in the demo environment`}>
          <div className="table-wrap">
            <table className="table rtable">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Username</th>
                  <th scope="col">Role</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className={a.createdInDemo ? 'row-new' : ''}>
                    <th scope="row" data-label="Name">
                      {a.name} {a.createdInDemo && <Badge tone="info" icon="plus">New</Badge>}
                    </th>
                    <td data-label="Username" className="tabular">{a.username}</td>
                    <td data-label="Role"><span className={`role-pill role-${a.role}`}>{ROLE_LABELS[a.role]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
