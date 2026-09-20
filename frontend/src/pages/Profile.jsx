import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Field, ErrorNote } from '../components/common.jsx';

export default function Profile() {
  const { user, setUser, signOut } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user?.name || '',
    semester: user?.semester ?? '',
    year: user?.year ?? '',
    collegeName: user?.collegeName || '',
    requiredAttendance: user?.requiredAttendance ?? 75,
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  async function saveProfile(event) {
    event.preventDefault();
    setError('');
    try {
      const { user: updated } = await api.auth.updateProfile({
        name: form.name,
        semester: form.semester === '' ? null : Number(form.semester),
        year: form.year === '' ? null : Number(form.year),
        collegeName: form.collegeName || null,
        requiredAttendance: Number(form.requiredAttendance),
      });
      setUser(updated);
      toast('Profile saved');
    } catch (err) {
      setError(err.message);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setPasswordError('');
    try {
      await api.auth.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      toast('Password changed');
    } catch (err) {
      setPasswordError(err.message);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Profile</h1>
          <p>Your default attendance requirement applies to every subject that does not set its own.</p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head">
            <h3>Details</h3>
          </div>
          <form onSubmit={saveProfile}>
            <ErrorNote error={error} />
            <Field label="Name">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email">
              <input value={user?.email || ''} disabled />
            </Field>
            <div className="field-row">
              <Field label="Semester">
                <input type="number" min="1" max="12" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
              </Field>
              <Field label="Year">
                <input type="number" min="1" max="8" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </Field>
            </div>
            <Field label="College">
              <input value={form.collegeName} onChange={(e) => setForm({ ...form, collegeName: e.target.value })} />
            </Field>
            <Field label="Required attendance %">
              <input
                type="number"
                min="1"
                max="100"
                value={form.requiredAttendance}
                onChange={(e) => setForm({ ...form, requiredAttendance: e.target.value })}
              />
            </Field>
            <button className="btn primary">Save changes</button>
          </form>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Password</h3>
          </div>
          <form onSubmit={savePassword}>
            <ErrorNote error={passwordError} />
            <Field label="Current password">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
            </Field>
            <button className="btn primary">Change password</button>
          </form>

          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '20px 0' }} />
          <button className="btn danger" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
