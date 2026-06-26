import { useState } from 'react';

export default function AddColumnForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await onAdd(trimmed);
      setTitle('');
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="add-column-button" onClick={() => setOpen(true)}>
        + Add column
      </button>
    );
  }

  return (
    <form className="add-column-form" onSubmit={submit}>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Column title"
        maxLength={60}
        disabled={busy}
      />
      <div className="form-actions">
        <button type="submit" disabled={busy || !title.trim()}>Add</button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setOpen(false);
            setTitle('');
          }}
          disabled={busy}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
