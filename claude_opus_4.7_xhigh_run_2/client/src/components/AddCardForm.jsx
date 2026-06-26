import { useState } from 'react';

export default function AddCardForm({ onAdd }) {
  const [content, setContent] = useState('');
  const [adding, setAdding] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setAdding(true);
    onAdd(trimmed, () => {
      setContent('');
      setAdding(false);
    });
  };

  return (
    <form onSubmit={submit} className="add-card-form">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a card…"
        rows={2}
        maxLength={1000}
        aria-label="New card content"
      />
      <button type="submit" disabled={!content.trim() || adding}>
        {adding ? '…' : 'Add'}
      </button>
    </form>
  );
}
