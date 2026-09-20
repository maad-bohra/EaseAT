import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  Meter,
  Ring,
  StatusPill,
  Loading,
  Empty,
  ErrorNote,
  greeting,
  formatDate,
  todayIso,
  shiftIso,
} from '../components/common.jsx';
import {
  IconRobot,
  IconUsers,
  IconXCircle,
  IconClipboardList,
  IconBan,
  IconTarget,
  IconCalendarPlus,
} from '../components/icons.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState({ loading: true });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [summary, schedule, predictions, calendar] = await Promise.all([
        api.attendance.summary(),
        api.attendance.today(),
        api.attendance.predictions(),
        api.calendar.list({ from: todayIso(), to: shiftIso(todayIso(), 21) }),
      ]);
      setState({ loading: false, summary, schedule, predictions: predictions.predictions, calendar: calendar.events });
      api.notifications.refresh().then(() => window.dispatchEvent(new Event('attendly:notifications'))).catch(() => {});
    } catch (err) {
      setError(err.message);
      setState({ loading: false });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function mark(sessionId, status) {
    try {
      await api.attendance.mark(sessionId, { status });
      toast(status === 'PRESENT' ? 'Marked present' : status === 'ABSENT' ? 'Marked absent' : 'Class cancelled');
      load();
    } catch (err) {
      toast(err.message);
    }
  }

  if (state.loading) return <Loading rows={4} />;
  if (error) return <ErrorNote error={error} />;

  const { summary, schedule, predictions, calendar } = state;
  const tomorrow = shiftIso(todayIso(), 1);
  const tomorrowEvents = (calendar || []).filter((e) => e.date === tomorrow && e.verified);
  const holidayTomorrow = tomorrowEvents.find((e) => e.type === 'HOLIDAY' || e.type === 'VACATION');
  const nextHoliday = (calendar || []).find((e) => e.verified && (e.type === 'HOLIDAY' || e.type === 'VACATION'));
  const nextExam = (calendar || []).find((e) => e.verified && e.type === 'EXAM');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            {greeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <p>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            {schedule.today.length > 0
              ? ` · ${schedule.today.length} ${schedule.today.length === 1 ? 'class' : 'classes'} today`
              : ' · no classes today'}
          </p>
        </div>
        <Link className="btn assistant" to="/assistant">
          <IconRobot size={17} />
          Ask the assistant
        </Link>
      </div>

      <div className="headline">
        <Ring value={summary.overall.percentage} />
        <div className="stack" style={{ gap: 10 }}>
          <div className="headline-meta">
            <div>
              <span className="stat-icon">
                <IconUsers size={16} />
              </span>
              <span className="stat-text">
                <span>Attended</span>
                <strong>{summary.overall.attended}</strong>
              </span>
            </div>
            <div>
              <span className="stat-icon">
                <IconXCircle size={16} />
              </span>
              <span className="stat-text">
                <span>Missed</span>
                <strong>{summary.overall.missed}</strong>
              </span>
            </div>
            <div>
              <span className="stat-icon">
                <IconClipboardList size={16} />
              </span>
              <span className="stat-text">
                <span>Counted classes</span>
                <strong>{summary.overall.totalCounted}</strong>
              </span>
            </div>
            <div>
              <span className="stat-icon">
                <IconBan size={16} />
              </span>
              <span className="stat-text">
                <span>Cancelled</span>
                <strong>{summary.overall.cancelled}</strong>
              </span>
            </div>
            <div>
              <span className="stat-icon">
                <IconTarget size={16} />
              </span>
              <span className="stat-text">
                <span>Required</span>
                <strong>{summary.overall.required}%</strong>
              </span>
            </div>
          </div>
          <p className="small" style={{ color: '#9dbcdb', margin: 0, maxWidth: '56ch' }}>
            {summary.overall.totalCounted === 0
              ? 'Nothing counted yet. Mark your first class to see this move.'
              : summary.overall.percentage >= summary.overall.required
                ? `You are ${(summary.overall.percentage - summary.overall.required).toFixed(1)} points above the requirement.`
                : `You are ${(summary.overall.required - summary.overall.percentage).toFixed(1)} points short of the requirement.`}
          </p>
        </div>
      </div>

      <div className="grid grid-dash" style={{ marginTop: 18 }}>
        <div>
          <div className="card">
            <div className="card-head">
              <h2>Today</h2>
              <Link className="small" to="/attendance">
                All classes
              </Link>
            </div>
            {schedule.today.length === 0 ? (
              <Empty
                title={holidayTomorrow ? 'Nothing scheduled' : 'No classes today'}
                icon={<IconCalendarPlus size={26} />}
              >
                Enjoy it, or add a one-off class from the Attendance page.
              </Empty>
            ) : (
              schedule.today.map((session) => (
                <div key={session.id} className={`class-item is-${session.status.toLowerCase()}`}>
                  <div className="time">{session.startTime}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="dot" style={{ background: session.subject.color }} />
                      <strong>{session.subject.name}</strong>
                      {session.isRescheduled && <span className="pill outline">Moved</span>}
                    </div>
                    <div className="meta">
                      {session.startTime}–{session.endTime}
                      {session.classroom ? ` · ${session.classroom}` : ''}
                    </div>
                  </div>
                  {session.status === 'PENDING' ? (
                    <div className="btn-group">
                      <button className="btn small primary" onClick={() => mark(session.id, 'PRESENT')}>
                        Present
                      </button>
                      <button className="btn small danger" onClick={() => mark(session.id, 'ABSENT')}>
                        Absent
                      </button>
                      <button className="btn small" onClick={() => mark(session.id, 'CANCELLED')}>
                        Cancelled
                      </button>
                    </div>
                  ) : (
                    <StatusPill status={session.status} />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Subjects</h2>
              <span className="small muted">Bar marker shows the requirement</span>
            </div>
            {summary.subjects.length === 0 ? (
              <Empty
                title="No subjects yet"
                action={
                  <Link className="btn primary" to="/subjects">
                    Add your first subject
                  </Link>
                }
              >
                Add subjects, then build the weekly timetable from them.
              </Empty>
            ) : (
              summary.subjects.map((subject) => (
                <div key={subject.subjectId} className="subject-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="dot" style={{ background: subject.color }} />
                    <strong>{subject.name}</strong>
                    {subject.code && <span className="tiny muted">{subject.code}</span>}
                  </div>
                  <div className="mono-num small">
                    <strong>{subject.percentage}%</strong>{' '}
                    <span className="muted">
                      · {subject.present}/{subject.counted}
                    </span>
                  </div>
                  <Meter value={subject.percentage} required={subject.required} />
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          {summary.warnings.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h3>Needs attention</h3>
              </div>
              {summary.warnings.map((w) => {
                const prediction = predictions.find((p) => p.subject.id === w.subjectId);
                return (
                  <div key={w.subjectId} style={{ marginBottom: 12 }}>
                    <div className="spread">
                      <strong>{w.name}</strong>
                      <span className={`pill ${w.status === 'BELOW' ? 'absent' : 'pending'}`}>{w.percentage}%</span>
                    </div>
                    <p className="small muted" style={{ margin: '4px 0 0' }}>
                      {prediction?.message}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="card tint-sky">
            <div className="card-head-row">
              <span className="card-icon sky">
                <IconUsers size={19} />
              </span>
              <h3>How many can you miss?</h3>
            </div>
            {predictions.length === 0 ? (
              <p className="small muted">Mark a few classes and this fills in.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Now</th>
                    <th>Can miss</th>
                    <th>Miss one</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p.subject.id}>
                      <td>{p.subject.name}</td>
                      <td className="mono-num">{p.current}%</td>
                      <td className="mono-num">
                        {p.canMiss === null ? '—' : p.canMiss}
                      </td>
                      <td className="mono-num muted">{p.projections.ifMissNext1}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card tint-cream">
            <div className="spread" style={{ marginBottom: 4 }}>
              <div className="card-head-row" style={{ marginBottom: 0 }}>
                <span className="card-icon amber">
                  <IconCalendarPlus size={19} />
                </span>
                <h3>Coming up</h3>
              </div>
              <Link className="small" to="/calendar">
                Calendar
              </Link>
            </div>
            {holidayTomorrow ? (
              <div className="alert info" style={{ marginBottom: 12 }}>
                Tomorrow is a college holiday{holidayTomorrow.title ? ` — ${holidayTomorrow.title}` : ''}. No classes
                will be counted.
              </div>
            ) : null}
            <div className="stack" style={{ gap: 8 }}>
              {nextHoliday && (
                <div className="spread small">
                  <span>{nextHoliday.title || 'Holiday'}</span>
                  <span className="muted">{formatDate(nextHoliday.date)}</span>
                </div>
              )}
              {nextExam && (
                <div className="spread small">
                  <span>{nextExam.title || 'Exam'}</span>
                  <span className="muted">{formatDate(nextExam.date)}</span>
                </div>
              )}
              {schedule.upcoming.slice(0, 4).map((session) => (
                <div key={session.id} className="spread small">
                  <span>
                    {session.subject.name} · {session.startTime}
                  </span>
                  <span className="muted">{formatDate(session.date)}</span>
                </div>
              ))}
              {!nextHoliday && !nextExam && schedule.upcoming.length === 0 && (
                <p className="small muted" style={{ margin: 0 }}>
                  Nothing scheduled in the next week.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
