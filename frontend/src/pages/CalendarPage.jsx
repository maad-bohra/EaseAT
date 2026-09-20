import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Loading, ErrorNote, StatusPill, Empty, formatDate, todayIso } from '../components/common.jsx';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthMatrix(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    return { iso: date.toISOString().slice(0, 10), inMonth: date.getUTCMonth() === month - 1 };
  });
}

export default function CalendarPage() {
  const today = todayIso();
  const [cursor, setCursor] = useState({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });
  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(today);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const cells = monthMatrix(cursor.year, cursor.month);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = cells[0].iso;
      const to = cells[cells.length - 1].iso;
      const [{ sessions: rows }, monthData] = await Promise.all([
        api.attendance.list({ from, to }),
        api.calendar.month(cursor.year, cursor.month),
      ]);
      setSessions(rows);
      setEvents(monthData.events);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.year, cursor.month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.calendar
      .day(selected)
      .then(setDetail)
      .catch((err) => toast(err.message));
  }, [selected, sessions, toast]);

  function shiftMonth(delta) {
    const next = new Date(Date.UTC(cursor.year, cursor.month - 1 + delta, 1));
    setCursor({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 });
  }

  const byDate = sessions.reduce((acc, s) => {
    (acc[s.date] = acc[s.date] || []).push(s);
    return acc;
  }, {});
  const eventsByDate = events.reduce((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e);
    return acc;
  }, {});

  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{monthLabel}</h1>
          <p>Each square shows one mark per class. Purple days come from the academic calendar.</p>
        </div>
        <div className="btn-group">
          <button className="btn" onClick={() => shiftMonth(-1)}>
            Previous
          </button>
          <button className="btn" onClick={() => setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) })}>
            Today
          </button>
          <button className="btn" onClick={() => shiftMonth(1)}>
            Next
          </button>
        </div>
      </div>

      <ErrorNote error={error} />

      <div className="grid grid-dash">
        <div className="card">
          {loading ? (
            <Loading rows={2} />
          ) : (
            <>
              <div className="month" style={{ marginBottom: 8 }}>
                {WEEKDAYS.map((day) => (
                  <div key={day} className="month-head">
                    {day}
                  </div>
                ))}
              </div>
              <div className="month">
                {cells.map((cell) => {
                  const dayEvents = eventsByDate[cell.iso] || [];
                  const holiday = dayEvents.find(
                    (e) => e.verified && (e.type === 'HOLIDAY' || e.type === 'VACATION'),
                  );
                  const exam = dayEvents.find((e) => e.verified && e.type === 'EXAM');
                  const daySessions = byDate[cell.iso] || [];
                  return (
                    <button
                      key={cell.iso}
                      className={[
                        'day-cell',
                        cell.inMonth ? '' : 'other-month',
                        cell.iso === today ? 'today' : '',
                        cell.iso === selected ? 'selected' : '',
                        holiday ? 'holiday' : '',
                      ].join(' ')}
                      onClick={() => setSelected(cell.iso)}
                    >
                      <span className="day-num">{Number(cell.iso.slice(8, 10))}</span>
                      {holiday && <span className="day-tag">{holiday.title || 'Holiday'}</span>}
                      {exam && <span className="day-tag">{exam.title || 'Exam'}</span>}
                      <span className="day-marks">
                        {daySessions.map((s) => (
                          <i key={s.id} className={`mark ${s.status.toLowerCase()}`} title={`${s.subject.name} ${s.startTime}`} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="legend" style={{ marginTop: 12 }}>
                <span>
                  <i className="mark present" /> Present
                </span>
                <span>
                  <i className="mark absent" /> Absent
                </span>
                <span>
                  <i className="mark pending" /> Not marked
                </span>
                <span>
                  <i className="mark cancelled" /> Cancelled
                </span>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3>{formatDate(selected)}</h3>
          </div>
          {!detail ? (
            <Loading rows={1} />
          ) : (
            <>
              {detail.events.length > 0 && (
                <div className="stack" style={{ marginBottom: 14 }}>
                  {detail.events.map((event) => (
                    <div key={event.id} className="spread small">
                      <span>{event.title || event.type.replace('_', ' ').toLowerCase()}</span>
                      <span className={`pill ${event.type === 'HOLIDAY' || event.type === 'VACATION' ? 'holiday' : 'outline'}`}>
                        {event.verified ? event.type.replace('_', ' ') : 'Needs review'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {detail.sessions.length === 0 ? (
                <Empty title="No classes">
                  {detail.events.some((e) => e.type === 'HOLIDAY' || e.type === 'VACATION')
                    ? 'A holiday, so nothing is counted for this day.'
                    : 'Nothing was scheduled on this date.'}
                </Empty>
              ) : (
                detail.sessions.map((session) => (
                  <div key={session.id} className={`class-item is-${session.status.toLowerCase()}`}>
                    <div className="time">{session.startTime}</div>
                    <div>
                      <strong>{session.subject.name}</strong>
                      <div className="meta">
                        {session.startTime}–{session.endTime}
                      </div>
                    </div>
                    <StatusPill status={session.status} />
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
