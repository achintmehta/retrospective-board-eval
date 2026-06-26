import { useState } from 'react';

export default function AddCardForm({ onSubmit }) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    const ok = await onSubmit(trimmed);
    setSubmitting(false);
    if (ok) setContent('');
  }

  return (
    <form onSubmit={handleSubmit} className="add-card-form">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a card…"
        rows={2}
        maxLength={500}
        disabled={submitting}
        aria-label="New card"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <button type="submit" disabled={submitting || !content.trim()}>
        Add Card
      </button>
    </form>
  );
}
