import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Field, Modal, Empty, Loading, ErrorNote } from '../components/common.jsx';

const COLORS = ['#2F6F4E', '#3A6EA5', '#8A5A2B', '#7A3E7E', '#B2472B', '#1F6F6B', '#5B6BB5', '#87741F'];

const blank = { name: '', code: '', faculty: '', credits: '', color: COLORS[0], requiredAttendance: '' };

export default function Subjects() {
  const toast = useToast();
  const [subjects, setSubjects] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.subjects.list();
      setSubjects(data.subjects);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm(blank);
    setFormError('');
    setEditing('new');
  }

  function openEdit(subject) {
    setForm({
      name: subject.name,
      code: subject.code || '',
      faculty: subject.faculty || '',
      credits: subject.credits ?? '',
      color: subject.color,
      requiredAttendance: subject.requiredAttendance ?? '',
    });
    setFormError('');
    setEditing(subject);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      faculty: form.faculty.trim() || null,
      credits: form.credits === '' ? null : Number(form.credits),
      color: form.color,
      requiredAttendance: form.requiredAttendance === '' ? null : Number(form.requiredAttendance),
    };
    try {
      if (editing === 'new') {
        await api.subjects.create(payload);
        toast('Subject added');
      } else {
        await api.subjects.update(editing.id, payload);
        toast('Subject updated');
      }
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(subject) {
    const sessions = subject._count?.sessions ?? 0;
    const confirmed = window.confirm(
      `Delete ${subject.name}? This removes its timetable slots and ${sessions} attendance records.`,
    );
    if (!confirmed) return;
    try {
      await api.subjects.remove(subject.id);
      toast('Subject deleted');
      load();
    } catch (err) {
      toast(err.message);
    }
  }

  if (!subjects && !error) return <Loading />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Subjects</h1>
          <p>Each subject carries its own colour and can override the attendance requirement.</p>
        </div>
        <button className="btn primary" onClick={openNew}>
          Add subject
        </button>
      </div>

      <ErrorNote error={error} />

      <div className="card">
        {subjects?.length === 0 ? (
          <Empty title="No subjects yet" action={<button className="btn primary" onClick={openNew}>Add subject</button>}>
            Start with the subjects on your semester card. Timetable slots attach to them.
          </Empty>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Code</th>
                  <th>Faculty</th>
                  <th>Credits</th>
                  <th>Required</th>
                  <th>Weekly classes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {subjects?.map((subject) => (
                  <tr key={subject.id}>
                    <td>
                      <span className="dot" style={{ background: subject.color, marginRight: 8 }} />
                      <strong>{subject.name}</strong>
                    </td>
                    <td className="muted">{subject.code || '—'}</td>
                    <td className="muted">{subject.faculty || '—'}</td>
                    <td className="mono-num">{subject.credits ?? '—'}</td>
                    <td className="mono-num">{subject.requiredAttendance ? `${subject.requiredAttendance}%` : 'Default'}</td>
                    <td className="mono-num">{subject._count?.timetableEntries ?? 0}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn small" onClick={() => openEdit(subject)}>
                        Edit
                      </button>{' '}
                      <button className="btn small danger" onClick={() => remove(subject)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Add subject' : `Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <ErrorNote error={formError} />
            <Field label="Name">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div className="field-row">
              <Field label="Code">
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CS301" />
              </Field>
              <Field label="Credits">
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={form.credits}
                  onChange={(e) => setForm({ ...form, credits: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Faculty">
              <input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} />
            </Field>
            <Field
              label="Required attendance %"
              hint="Leave blank to use your account default."
            >
              <input
                type="number"
                min="1"
                max="100"
                value={form.requiredAttendance}
                onChange={(e) => setForm({ ...form, requiredAttendance: e.target.value })}
              />
            </Field>
            <Field label="Colour">
              <div className="row">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Use ${color}`}
                    onClick={() => setForm({ ...form, color })}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: color,
                      border: form.color === color ? '2px solid #16241D' : '1px solid #dce2d8',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save subject'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
