import { FormEvent, useState } from 'react';

interface Props {
  onAdd: (content: string) => void;
}

export default function AddCardForm({ onAdd }: Props) {
  const [content, setContent] = useState('');
  const [open, setOpen] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setContent('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="add-card-toggle"
        onClick={() => setOpen(true)}
      >
        + Add card
      </button>
    );
  }

  return (
    <form className="add-card-form" onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What happened?"
        rows={3}
        autoFocus
        maxLength={500}
      />
      <div className="form-actions">
        <button type="submit" disabled={!content.trim()}>
          Add
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setOpen(false);
            setContent('');
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
