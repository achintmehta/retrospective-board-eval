import { useState } from 'react';

export default function AddCardForm({ onAdd }) {
  const [content, setContent] = useState('');
  const [open, setOpen] = useState(false);

  function submit(e) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setContent('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button className="add-card-button" onClick={() => setOpen(true)}>
        + Add card
      </button>
    );
  }

  return (
    <form className="add-card-form" onSubmit={submit}>
      <textarea
        autoFocus
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows={3}
        maxLength={1000}
      />
      <div className="form-actions">
        <button type="submit" disabled={!content.trim()}>Add</button>
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
