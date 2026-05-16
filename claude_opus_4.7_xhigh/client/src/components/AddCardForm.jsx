import { useState } from 'react';
import { emitWithAck } from '../socket.js';

export default function AddCardForm({ columnId }) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await emitWithAck('add_card', { columnId, content: trimmed });
      setContent('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="add-card-form">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        maxLength={500}
        rows={2}
      />
      <button type="submit" disabled={!content.trim() || submitting}>
        Add card
      </button>
      {error && <p className="error small">{error}</p>}
    </form>
  );
}
