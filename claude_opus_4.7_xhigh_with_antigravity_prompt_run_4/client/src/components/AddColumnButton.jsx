import { useState } from 'react';

export default function AddColumnButton({ onAdd, disabled }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function submit(e) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    onAdd(title);
    setDraft('');
    setEditing(false);
  }

  if (editing) {
    return (
      <section className="column column--draft">
        <form className="column-draft-form" onSubmit={submit}>
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Column name"
            maxLength={60}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditing(false);
                setDraft('');
              }
            }}
          />
          <div className="column-draft-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditing(false);
                setDraft('');
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>
              Add column
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <button
      type="button"
      className="add-column-btn"
      id="add-column-btn"
      onClick={() => setEditing(true)}
      disabled={disabled}
    >
      <span aria-hidden="true">+</span>
      <span>Add column</span>
    </button>
  );
}
