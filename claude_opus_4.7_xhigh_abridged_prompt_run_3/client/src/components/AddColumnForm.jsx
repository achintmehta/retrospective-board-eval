import { useState } from 'react';

export default function AddColumnForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(title.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="column-form" onSubmit={submit}>
      <input
        autoFocus
        className="input"
        placeholder="Column name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={60}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="column-form__row">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn--primary btn--sm"
          disabled={submitting || !title.trim()}
        >
          Add
        </button>
      </div>
    </form>
  );
}
