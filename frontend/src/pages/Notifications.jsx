import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Loading, Empty, ErrorNote } from '../components/common.jsx';

export default function Notifications() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await api.notifications.list({ limit: 50 });
      setItems(data.notifications);
      window.dispatchEvent(new Event('EaseAT:notifications'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    api.notifications.refresh().catch(() => {}).finally(load);
  }, []);

  async function markAll() {
    await api.notifications.markAllRead();
    toast('All marked as read');
    load();
  }

  if (!items && !error) return <Loading />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <p>Attendance warnings, holidays, exams and classes still waiting to be marked.</p>
        </div>
        <div className="btn-group">
          <button className="btn" onClick={() => api.notifications.refresh().then(load)}>
            Check now
          </button>
          <button className="btn primary" onClick={markAll}>
            Mark all read
          </button>
        </div>
      </div>

      <ErrorNote error={error} />

      <div className="card">
        {items?.length === 0 ? (
          <Empty title="Nothing to report">Warnings appear here as soon as a subject drifts towards the limit.</Empty>
        ) : (
          items?.map((item) => (
            <div key={item.id} className="notif">
              <span className="unread-dot" style={{ background: item.read ? 'transparent' : undefined }} />
              <div>
                <strong>{item.title}</strong>
                <div className="small muted">{item.message}</div>
                <div className="tiny muted">{new Date(item.createdAt).toLocaleString()}</div>
              </div>
              <div className="btn-group">
                {!item.read && (
                  <button className="btn small" onClick={() => api.notifications.markRead(item.id).then(load)}>
                    Mark read
                  </button>
                )}
                <button className="btn small ghost" onClick={() => api.notifications.remove(item.id).then(load)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
