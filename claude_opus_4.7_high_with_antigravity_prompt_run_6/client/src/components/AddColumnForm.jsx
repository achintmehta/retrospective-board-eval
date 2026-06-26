import { useState } from 'react';

export default function AddColumnForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  function submit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onAdd(t);
    setTitle('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" className="add-column-trigger" onClick={() => setOpen(true)}>
        + Add column
      </button>
    );
  }

  return (
    <form className="add-column-form" onSubmit={submit}>
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Column name"
        maxLength={80}
      />
      <div className="add-card-actions">
        <button type="submit" disabled={!title.trim()}>Add</button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setOpen(false);
            setTitle('');
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
