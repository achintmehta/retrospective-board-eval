import { useState } from 'react';
import { api } from '../api.js';

export default function AddColumnForm({ boardId, onCreated }) {
  const [title, setTitle] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const column = await api.createColumn(boardId, trimmed);
      onCreated?.(column);
      setTitle('');
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="add-column-toggle" onClick={() => setOpen(true)}>
        + Add column
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="add-column-form">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Column title"
        maxLength={60}
      />
      <div className="row">
        <button type="submit" disabled={!title.trim() || submitting}>Add</button>
        <button type="button" className="link-button" onClick={() => { setOpen(false); setTitle(''); }}>
          Cancel
        </button>
      </div>
      {error && <p className="error small">{error}</p>}
    </form>
  );
}
