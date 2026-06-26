import React, { useState } from 'react';

export default function AddCardForm({ onSubmit }) {
  const [content, setContent] = useState('');
  const [open, setOpen] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    await onSubmit(content.trim());
    setContent('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" className="add-card-toggle" onClick={() => setOpen(true)}>
        + Add card
      </button>
    );
  }

  return (
    <form className="add-card-form" onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows={3}
        autoFocus
        maxLength={1000}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
          if (e.key === 'Escape') {
            setContent('');
            setOpen(false);
          }
        }}
      />
      <div className="add-card-actions">
        <button type="submit" disabled={!content.trim()}>Add</button>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setContent('');
            setOpen(false);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
