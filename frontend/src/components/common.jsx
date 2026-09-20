import { useEffect } from 'react';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const STATUS_LABELS = {
  PENDING: 'Not marked',
  PRESENT: 'Present',
  ABSENT: 'Absent',
  CANCELLED: 'Cancelled',
  NO_CLASS: 'No class',
};

export function StatusPill({ status }) {
  return <span className={`pill ${status.toLowerCase()}`}>{STATUS_LABELS[status] || status}</span>;
}

/** Attendance bar with a marker at the required percentage. */
export function Meter({ value, required }) {
  const tone = value < required ? 'below' : value < required + 5 ? 'risk' : '';
  return (
    <div className={`meter ${tone}`} role="img" aria-label={`${value}% attended, ${required}% required`}>
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      <span className="threshold" style={{ left: `${required}%` }} />
    </div>
  );
}

/** Circular progress ring used for the headline attendance figure. */
export function Ring({ value = 0, size = 108, stroke = 11 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring" role="img" aria-label={`${pct}% attendance`}>
      <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
      <circle
        className="ring-fill"
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="ring-label" style={{ fontSize: size * 0.2 }}>
        {pct}%
      </text>
    </svg>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error">{error}</span>}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, children, action, icon }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      <p className="small">{children}</p>
      {action}
    </div>
  );
}

export function Loading({ rows = 3 }) {
  return (
    <div className="stack" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return <div className="alert error">{error}</div>;
}

export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function shiftIso(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
