import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Field,
  Modal,
  Loading,
  Empty,
  ErrorNote,
  StatusPill,
  Meter,
  formatDate,
  todayIso,
  shiftIso,
} from '../components/common.jsx';

export default function Attendance() {
  const toast = useToast();
  const [filters, setFilters] = useState({
    from: shiftIso(todayIso(), -14),
    to: shiftIso(todayIso(), 14),
    subjectId: '',
    status: '',
  });
  const [sessions, setSessions] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState('');
  const [rescheduling, setRescheduling] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: todayIso(), startTime: '11:00', endTime: '12:00', reason: '' });
  const [modalError, setModalError] = useState('');

  const load = useCallback(async () => {
    try {
      const [{ sessions: rows }, { subjects: subjectList }] = await Promise.all([
        api.attendance.list(filters),
        api.subjects.list(),
      ]);
      setSessions(rows);
      setSubjects(subjectList);
      if (filters.subjectId) {
        setPrediction(await api.attendance.prediction(filters.subjectId));
      } else {
        setPrediction(null);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function mark(session, status) {
    try {
      await api.attendance.mark(session.id, { status });
      toast(`${session.subject.name} at ${session.startTime} marked ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast(err.message);
    }
  }

  function openReschedule(session) {
    setRescheduleForm({
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      reason: '',
    });
    setModalError('');
    setRescheduling(session);
  }

  async function submitReschedule(event) {
    event.preventDefault();
    setModalError('');
    try {
      await api.attendance.reschedule(rescheduling.id, rescheduleForm);
      toast('Class moved');
      setRescheduling(null);
      load();
    } catch (err) {
      setModalError(err.message);
    }
  }

  if (!sessions && !error) return <Loading />;

  const grouped = (sessions || []).reduce((acc, session) => {
    (acc[session.date] = acc[session.date] || []).push(session);
    return acc;
  }, {});

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Attendance</h1>
          <p>Every row is one class. Cancelled classes stay in the history but never touch the percentage.</p>
        </div>
      </div>

      <ErrorNote error={error} />

      <div className="card">
        <div className="row">
          <Field label="From">
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </Field>
          <Field label="To">
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </Field>
          <Field label="Subject">
            <select value={filters.subjectId} onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}>
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Any status</option>
              <option value="PENDING">Not marked</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </Field>
        </div>
      </div>

      {prediction && (
        <div className="card">
          <div className="card-head">
            <h3>{prediction.subject.name}</h3>
            <span className="mono-num">
              {prediction.current}% of {prediction.counted} counted classes
            </span>
          </div>
          <Meter value={prediction.current} required={prediction.required} />
          <p style={{ marginBottom: 10 }}>{prediction.message}</p>
          <div className="grid grid-3">
            <div>
              <span className="tiny muted">If you miss the next class</span>
              <div className="mono-num">
                <strong>{prediction.projections.ifMissNext1}%</strong>
              </div>
            </div>
            <div>
              <span className="tiny muted">If you attend the next 3</span>
              <div className="mono-num">
                <strong>{prediction.projections.ifAttendNext3}%</strong>
              </div>
            </div>
            <div>
              <span className="tiny muted">To reach 85%</span>
              <div className="mono-num">
                <strong>
                  {prediction.targets.find((t) => t.target === 85)?.classesNeeded ?? '—'} classes
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {Object.keys(grouped).length === 0 ? (
          <Empty title="No classes in this range">
            Adjust the dates, or generate sessions from the Timetable page.
          </Empty>
        ) : (
          Object.entries(grouped).map(([date, rows]) => (
            <div key={date} style={{ marginBottom: 18 }}>
              <div className="spread" style={{ marginBottom: 8 }}>
                <strong>{formatDate(date)}</strong>
                <span className="tiny muted">
                  {rows.filter((r) => r.status === 'PRESENT').length} present ·{' '}
                  {rows.filter((r) => r.status === 'ABSENT').length} absent
                </span>
              </div>
              {rows.map((session) => (
                <div key={session.id} className={`class-item is-${session.status.toLowerCase()}`}>
                  <div className="time">{session.startTime}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="dot" style={{ background: session.subject.color }} />
                      <strong>{session.subject.name}</strong>
                      {session.isRescheduled && <span className="pill outline">Moved here</span>}
                    </div>
                    <div className="meta">
                      {session.startTime}–{session.endTime}
                      {session.classroom ? ` · ${session.classroom}` : ''}
                      {session.notes ? ` · ${session.notes}` : ''}
                    </div>
                  </div>
                  <div className="btn-group">
                    {session.status !== 'PRESENT' && (
                      <button className="btn small primary" onClick={() => mark(session, 'PRESENT')}>
                        Present
                      </button>
                    )}
                    {session.status !== 'ABSENT' && (
                      <button className="btn small danger" onClick={() => mark(session, 'ABSENT')}>
                        Absent
                      </button>
                    )}
                    {session.status !== 'CANCELLED' && (
                      <button className="btn small" onClick={() => mark(session, 'CANCELLED')}>
                        Cancelled
                      </button>
                    )}
                    <button className="btn small" onClick={() => openReschedule(session)}>
                      Move
                    </button>
                    <StatusPill status={session.status} />
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {rescheduling && (
        <Modal
          title={`Move ${rescheduling.subject.name} from ${formatDate(rescheduling.date)} ${rescheduling.startTime}`}
          onClose={() => setRescheduling(null)}
        >
          <form onSubmit={submitReschedule}>
            <ErrorNote error={modalError} />
            <p className="small muted">
              The original class is marked cancelled and kept in your history. The new slot counts normally.
            </p>
            <Field label="New date">
              <input
                type="date"
                required
                value={rescheduleForm.date}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
              />
            </Field>
            <div className="field-row">
              <Field label="Starts">
                <input
                  type="time"
                  required
                  value={rescheduleForm.startTime}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, startTime: e.target.value })}
                />
              </Field>
              <Field label="Ends">
                <input
                  type="time"
                  required
                  value={rescheduleForm.endTime}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, endTime: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Reason (optional)">
              <input
                value={rescheduleForm.reason}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                placeholder="Faculty on leave"
              />
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setRescheduling(null)}>
                Cancel
              </button>
              <button className="btn primary">Move class</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
