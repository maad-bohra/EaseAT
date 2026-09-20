import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, ErrorNote } from '../components/common.jsx';

export default function Register() {
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    semester: '',
    collegeName: '',
    requiredAttendance: 75,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signUp({
        ...form,
        semester: form.semester ? Number(form.semester) : undefined,
        collegeName: form.collegeName || undefined,
        requiredAttendance: Number(form.requiredAttendance),
      });
      navigate('/subjects');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth-form">
        <div className="inner">
          <div className="brand" style={{ marginBottom: 28, justifyContent: 'center' }}>
            <span className="brand-mark">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9.5 12 4l10 5.5-10 5.5-10-5.5Z" />
                <path d="M6.5 11.8v4.4c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-4.4" />
                <path d="M22 9.5v6" />
              </svg>
            </span>
            <span style={{ color: 'var(--ink)' }}>Attendly</span>
          </div>
          <h2 style={{ marginBottom: 6 }}>Create your account</h2>
          <p className="muted small" style={{ marginTop: 0, marginBottom: 18 }}>
            Takes about a minute.
          </p>
          <form onSubmit={submit}>
            <ErrorNote error={error} />
            <Field label="Name">
              <input required value={form.name} onChange={update('name')} autoComplete="name" />
            </Field>
            <Field label="Email">
              <input type="email" required value={form.email} onChange={update('email')} autoComplete="email" />
            </Field>
            <Field label="Password" hint="At least 8 characters.">
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={update('password')}
                autoComplete="new-password"
              />
            </Field>
            <div className="field-row">
              <Field label="Semester">
                <input type="number" min="1" max="12" value={form.semester} onChange={update('semester')} />
              </Field>
              <Field label="Required attendance %">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.requiredAttendance}
                  onChange={update('requiredAttendance')}
                />
              </Field>
            </div>
            <Field label="College (optional)">
              <input value={form.collegeName} onChange={update('collegeName')} />
            </Field>
            <button className="btn primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </form>
          <p className="small muted" style={{ marginTop: 16 }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
