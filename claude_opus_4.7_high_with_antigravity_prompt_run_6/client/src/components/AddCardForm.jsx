import { useState } from 'react';

export default function AddCardForm({ onAdd }) {
  const [content, setContent] = useState('');
  const [open, setOpen] = useState(false);

  function submit(e) {
    e.preventDefault();
    const t = content.trim();
    if (!t) return;
    onAdd(t);
    setContent('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="add-card-trigger"
        onClick={() => setOpen(true)}
      >
        + Add a card
      </button>
    );
  }

  return (
    <form className="add-card-form" onSubmit={submit}>
      <textarea
        autoFocus
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        maxLength={1000}
      />
      <div className="add-card-actions">
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
