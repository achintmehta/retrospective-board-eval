import { FormEvent, useState } from 'react';

interface Props {
  onAdd: (title: string) => Promise<void> | void;
}

export default function AddColumnForm({ onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setTitle('');
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="add-column-toggle"
        onClick={() => setOpen(true)}
      >
        + Add column
      </button>
    );
  }

  return (
    <form className="add-column-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Column title"
        maxLength={80}
        autoFocus
      />
      <div className="form-actions">
        <button type="submit" disabled={submitting || !title.trim()}>
          {submitting ? 'Adding…' : 'Add'}
        </button>
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
