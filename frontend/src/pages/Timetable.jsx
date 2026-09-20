import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Field, Modal, Loading, Empty, ErrorNote, DAY_NAMES, todayIso, shiftIso } from '../components/common.jsx';

const blank = { subjectId: '', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', classroom: '', faculty: '' };

export default function Timetable() {
  const toast = useToast();
  const [week, setWeek] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  // Natural-language import
  const [aiEnabled, setAiEnabled] = useState(false);
  const [nlOpen, setNlOpen] = useState(false);
  const [nlText, setNlText] = useState('');
  const [nlDraft, setNlDraft] = useState(null);
  const [nlError, setNlError] = useState('');
  const [nlBusy, setNlBusy] = useState(false);

  async function load() {
    try {
      const [timetable, subjectList] = await Promise.all([api.timetable.list(), api.subjects.list()]);
      setWeek(timetable.week);
      setSubjects(subjectList.subjects);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    api.ai.status().then((s) => setAiEnabled(s.enabled)).catch(() => {});
  }, []);

  function openNew(dayOfWeek = 1) {
    setForm({ ...blank, dayOfWeek, subjectId: subjects[0]?.id || '' });
    setFormError('');
    setEditing('new');
  }

  function openEdit(entry) {
    setForm({
      subjectId: entry.subjectId,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      classroom: entry.classroom || '',
      faculty: entry.faculty || '',
    });
    setFormError('');
    setEditing(entry);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    const payload = {
      subjectId: form.subjectId,
      dayOfWeek: Number(form.dayOfWeek),
      startTime: form.startTime,
      endTime: form.endTime,
      classroom: form.classroom.trim() || null,
      faculty: form.faculty.trim() || null,
    };
    try {
      if (editing === 'new') {
        await api.timetable.create(payload);
        toast('Class added to the timetable');
      } else {
        await api.timetable.update(editing.id, payload);
        toast('Class slot updated');
      }
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry) {
    if (!window.confirm(`Remove ${entry.subject.name} at ${entry.startTime}? Unmarked future classes go with it.`)) return;
    try {
      await api.timetable.remove(entry.id);
      toast('Class slot removed');
      load();
    } catch (err) {
      toast(err.message);
    }
  }

  async function parseText() {
    setNlBusy(true);
    setNlError('');
    try {
      const { draft } = await api.ai.parseTimetable(nlText);
      if (draft.length === 0) setNlError('Nothing could be read from that. Try naming the day and time explicitly.');
      setNlDraft(draft);
    } catch (err) {
      setNlError(err.message);
    } finally {
      setNlBusy(false);
    }
  }

  /** Creates any missing subjects first, then the slots. Runs only on confirm. */
  async function confirmDraft() {
    setNlBusy(true);
    setNlError('');
    try {
      const nameToId = new Map(subjects.map((s) => [s.name.toLowerCase(), s.id]));
      const entries = [];
      for (const row of nlDraft) {
        let subjectId = row.subjectId || nameToId.get((row.subjectName || '').toLowerCase());
        if (!subjectId) {
          const { subject } = await api.subjects.create({ name: row.subjectName });
          subjectId = subject.id;
          nameToId.set(subject.name.toLowerCase(), subject.id);
        }
        entries.push({
          subjectId,
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
          classroom: row.classroom,
          faculty: row.faculty,
        });
      }
      const result = await api.ai.confirmTimetable(entries);
      toast(`${result.created} classes added`);
      setNlOpen(false);
      setNlDraft(null);
      setNlText('');
      load();
    } catch (err) {
      setNlError(err.message);
    } finally {
      setNlBusy(false);
    }
  }

  async function generate() {
    try {
      const result = await api.attendance.generate(todayIso(), shiftIso(todayIso(), 60));
      toast(`${result.created} class sessions generated`);
    } catch (err) {
      toast(err.message);
    }
  }

  if (!week && !error) return <Loading />;

  const hasSubjects = subjects.length > 0;
  const days = week?.slice(0, 7).filter((d) => d.dayOfWeek !== 0 || d.entries.length > 0) || [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Weekly timetable</h1>
          <p>
            Add each class separately. The same subject twice in one day is normal and produces two
            attendance sessions.
          </p>
        </div>
        <div className="btn-group">
          <button className="btn" onClick={generate}>
            Generate 60 days
          </button>
          {aiEnabled && (
            <button className="btn" onClick={() => setNlOpen(true)}>
              Describe in words
            </button>
          )}
          <button className="btn primary" onClick={() => openNew()} disabled={!hasSubjects}>
            Add class
          </button>
        </div>
      </div>

      <ErrorNote error={error} />

      {!hasSubjects ? (
        <div className="card">
          <Empty title="Add subjects first">Timetable slots point at a subject, so start there.</Empty>
        </div>
      ) : (
        <div className="week">
          {days.map((day) => (
            <div key={day.dayOfWeek} className="week-day">
              <h4>{day.day}</h4>
              {day.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="slot"
                  style={{ background: `${entry.subject.color}14`, borderLeftColor: entry.subject.color }}
                >
                  <div className="slot-time">
                    {entry.startTime}–{entry.endTime}
                  </div>
                  <div className="slot-name">{entry.subject.name}</div>
                  {entry.classroom && <div className="tiny muted">{entry.classroom}</div>}
                  <div className="btn-group" style={{ marginTop: 6 }}>
                    <button className="btn small ghost" onClick={() => openEdit(entry)}>
                      Edit
                    </button>
                    <button className="btn small ghost" onClick={() => remove(entry)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button className="btn small ghost" onClick={() => openNew(day.dayOfWeek)}>
                + Add
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Add class' : 'Edit class'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <ErrorNote error={formError} />
            <Field label="Subject">
              <select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                <option value="">Choose a subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.code ? ` (${s.code})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Day">
              <select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
                {DAY_NAMES.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </Field>
            <div className="field-row">
              <Field label="Starts">
                <input type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </Field>
              <Field label="Ends">
                <input type="time" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </Field>
            </div>
            <div className="field-row">
              <Field label="Room">
                <input value={form.classroom} onChange={(e) => setForm({ ...form, classroom: e.target.value })} />
              </Field>
              <Field label="Faculty">
                <input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} />
              </Field>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save class'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {nlOpen && (
        <Modal title="Describe your timetable" onClose={() => setNlOpen(false)}>
          <ErrorNote error={nlError} />
          {!nlDraft ? (
            <>
              <Field
                label="What does your week look like?"
                hint="Example: DSA every Monday and Wednesday at 9 AM, and another DSA class Monday at 2 PM."
              >
                <textarea rows={4} value={nlText} onChange={(e) => setNlText(e.target.value)} />
              </Field>
              <div className="modal-actions">
                <button className="btn" onClick={() => setNlOpen(false)}>
                  Cancel
                </button>
                <button className="btn primary" onClick={parseText} disabled={nlBusy || nlText.trim().length < 5}>
                  {nlBusy ? 'Reading…' : 'Preview classes'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="small muted">Check these before they are saved. Nothing has been added yet.</p>
              {DAY_NAMES.map((day, index) => {
                const rows = nlDraft.filter((r) => r.dayOfWeek === index);
                if (rows.length === 0) return null;
                return (
                  <div key={day} style={{ marginBottom: 10 }}>
                    <strong className="small">{day}</strong>
                    {rows.map((row, i) => (
                      <div key={i} className="spread small" style={{ padding: '3px 0' }}>
                        <span>
                          {row.startTime}–{row.endTime} {row.subjectName}
                        </span>
                        {row.isNewSubject && <span className="pill outline">New subject</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
              <div className="modal-actions">
                <button className="btn" onClick={() => setNlDraft(null)}>
                  Back
                </button>
                <button className="btn primary" onClick={confirmDraft} disabled={nlBusy || nlDraft.length === 0}>
                  {nlBusy ? 'Saving…' : `Add ${nlDraft.length} classes`}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
