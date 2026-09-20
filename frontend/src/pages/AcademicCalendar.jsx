import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Field, Modal, Loading, Empty, ErrorNote, formatDate, todayIso } from '../components/common.jsx';

const TYPES = ['HOLIDAY', 'WORKING_DAY', 'EXAM', 'VACATION', 'SEMESTER_START', 'SEMESTER_END', 'OTHER'];
const label = (type) => type.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default function AcademicCalendar() {
  const toast = useToast();
  const fileInput = useRef(null);
  const [events, setEvents] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: todayIso(), type: 'HOLIDAY', title: '' });
  const [formError, setFormError] = useState('');

  async function load() {
    try {
      const [{ events: rows }, { files: uploads }] = await Promise.all([
        api.calendar.list(),
        api.calendar.uploads(),
      ]);
      setEvents(rows);
      setFiles(uploads);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const result = await api.calendar.upload(file);
      setNotice(result.message);
      setSelected(new Set(result.events.map((e) => e.id)));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function confirmSelected() {
    try {
      const result = await api.calendar.verify([...selected]);
      toast(`${result.verified} dates confirmed`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast(err.message);
    }
  }

  async function remove(id) {
    try {
      await api.calendar.remove(id);
      toast('Entry deleted');
      load();
    } catch (err) {
      toast(err.message);
    }
  }

  async function addManual(event) {
    event.preventDefault();
    setFormError('');
    try {
      await api.calendar.create({ ...form, title: form.title.trim() || null, verified: true });
      toast('Date added');
      setAdding(false);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  function toggle(id) {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (!events && !error) return <Loading />;

  const pending = (events || []).filter((e) => !e.verified);
  const confirmed = (events || []).filter((e) => e.verified);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Academic calendar</h1>
          <p>
            Upload your college PDF. Extracted dates wait here until you confirm them — nothing
            changes your attendance before that.
          </p>
        </div>
        <div className="btn-group">
          <button className="btn" onClick={() => setAdding(true)}>
            Add a date
          </button>
          <button className="btn primary" onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? 'Reading PDF…' : 'Upload PDF'}
          </button>
          <input ref={fileInput} type="file" accept="application/pdf" hidden onChange={upload} />
        </div>
      </div>

      <ErrorNote error={error} />
      {notice && <div className="alert info" style={{ marginBottom: 16 }}>{notice}</div>}

      {pending.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h2>Review {pending.length} extracted dates</h2>
            <div className="btn-group">
              <button className="btn small" onClick={() => setSelected(new Set(pending.map((e) => e.id)))}>
                Select all
              </button>
              <button className="btn small primary" onClick={confirmSelected} disabled={selected.size === 0}>
                Confirm {selected.size || ''}
              </button>
            </div>
          </div>
          <p className="small muted">
            Confirmed holidays remove unmarked classes on those dates. Anything wrong can be edited or deleted.
          </p>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th />
                  <th>Date</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pending.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <input type="checkbox" checked={selected.has(event.id)} onChange={() => toggle(event.id)} />
                    </td>
                    <td className="mono-num">{formatDate(event.date)}</td>
                    <td>
                      <select
                        value={event.type}
                        onChange={async (e) => {
                          await api.calendar.update(event.id, { type: e.target.value });
                          load();
                        }}
                      >
                        {TYPES.map((type) => (
                          <option key={type} value={type}>
                            {label(type)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="muted">{event.title || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn small danger" onClick={() => remove(event.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h2>Confirmed dates</h2>
          <span className="small muted">{confirmed.length} in use</span>
        </div>
        {confirmed.length === 0 ? (
          <Empty title="Nothing confirmed yet">
            Upload a PDF or add holidays by hand. Until then every timetabled class is generated.
          </Empty>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Source</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {confirmed.map((event) => (
                  <tr key={event.id}>
                    <td className="mono-num">{formatDate(event.date)}</td>
                    <td>
                      <span className={`pill ${event.type === 'HOLIDAY' || event.type === 'VACATION' ? 'holiday' : 'outline'}`}>
                        {label(event.type)}
                      </span>
                    </td>
                    <td>{event.title || '—'}</td>
                    <td className="muted small">{event.source === 'AI_EXTRACTION' ? 'From PDF' : 'Added by you'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn small danger" onClick={() => remove(event.id)}>
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

      {files.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h3>Uploaded files</h3>
          </div>
          {files.map((file) => (
            <div key={file.id} className="spread small" style={{ padding: '6px 0' }}>
              <span>{file.originalName}</span>
              <span className="muted">
                {(file.sizeBytes / 1024).toFixed(0)} KB · {file._count.events} dates · {file.status.toLowerCase()}
              </span>
              <button
                className="btn small danger"
                onClick={async () => {
                  await api.calendar.removeUpload(file.id);
                  load();
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <Modal title="Add a calendar date" onClose={() => setAdding(false)}>
          <form onSubmit={addManual}>
            <ErrorNote error={formError} />
            <Field label="Date">
              <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {label(type)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Name (optional)" hint="Gandhi Jayanti, Internal assessment I, and so on.">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button className="btn primary">Add date</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
