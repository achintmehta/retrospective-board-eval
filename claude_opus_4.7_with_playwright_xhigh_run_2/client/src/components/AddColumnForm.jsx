import React, { useState } from 'react';

export default function AddColumnForm({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [open, setOpen] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit(title.trim());
    setTitle('');
    setOpen(false);
  }

  return (
    <section className="add-column">
      {open ? (
        <form onSubmit={handleSubmit} className="add-column-form">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Column title"
            autoFocus
            maxLength={80}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setTitle('');
                setOpen(false);
              }
            }}
          />
          <div className="add-column-actions">
            <button type="submit" disabled={!title.trim()}>Add</button>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setTitle('');
                setOpen(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="add-column-toggle" onClick={() => setOpen(true)}>
          + Add column
        </button>
      )}
    </section>
  );
}
