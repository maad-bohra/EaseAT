import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { ErrorNote } from '../components/common.jsx';

const SUGGESTIONS = [
  'How much is my attendance?',
  'Can I miss tomorrow\u2019s DSA class?',
  'How many DSA classes do I need to reach 80%?',
  'What classes do I have tomorrow?',
  'Is tomorrow a holiday?',
];

export default function Assistant() {
  const [enabled, setEnabled] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    api.ai
      .status()
      .then((s) => setEnabled(s.enabled))
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(question) {
    const text = (question ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setError('');
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setBusy(true);
    try {
      const { answer } = await api.ai.ask(text, history);
      setMessages((m) => [...m, { role: 'assistant', content: answer }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Assistant</h1>
          <p>
            It reads your real attendance records and quotes the numbers the app calculated. It cannot
            change anything or invent a percentage.
          </p>
        </div>
      </div>

      {enabled === false && (
        <div className="alert info" style={{ marginBottom: 16 }}>
          The assistant needs an AI key on the server. Everything else in Attendly works without it —
          add ANTHROPIC_API_KEY to the backend environment to switch this on.
        </div>
      )}

      <div className="card">
        <ErrorNote error={error} />
        <div className="chat">
          {messages.length === 0 && (
            <div className="bubble ai">
              Ask about your attendance, what is on tomorrow, or how many classes you can still miss.
            </div>
          )}
          {messages.map((message, index) => (
            <div key={index} className={`bubble ${message.role === 'user' ? 'user' : 'ai'}`}>
              {message.content}
            </div>
          ))}
          {busy && <div className="bubble ai muted">Checking your records…</div>}
          <div ref={endRef} />
        </div>

        <div className="suggestions">
          {SUGGESTIONS.map((suggestion) => (
            <button key={suggestion} className="btn small" onClick={() => send(suggestion)} disabled={busy || !enabled}>
              {suggestion}
            </button>
          ))}
        </div>

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your attendance"
            disabled={!enabled || busy}
          />
          <button className="btn primary" disabled={!enabled || busy || input.trim().length < 2}>
            Send
          </button>
        </form>
      </div>
    </>
  );
}
