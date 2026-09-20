import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, ErrorNote } from '../components/common.jsx';

export default function Login() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(form);
      navigate('/');
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
          <h2 style={{ marginBottom: 6 }}>Sign in</h2>
          <p className="muted small" style={{ marginTop: 0, marginBottom: 18 }}>
            Pick up where your attendance left off.
          </p>
          <form onSubmit={submit}>
            <ErrorNote error={error} />
            <Field label="Email">
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <button className="btn primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="small muted" style={{ marginTop: 16 }}>
            New here? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
