import { useState } from 'react';

export default function AddColumnForm({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    const ok = await onSubmit(trimmed);
    setSubmitting(false);
    if (ok) {
      setTitle('');
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="add-column-button" onClick={() => setOpen(true)}>
        + Add column
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="add-column-form">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Column title"
        maxLength={80}
        disabled={submitting}
        aria-label="New column title"
      />
      <div className="add-column-actions">
        <button type="submit" disabled={submitting || !title.trim()}>
          Add
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setOpen(false);
            setTitle('');
          }}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
