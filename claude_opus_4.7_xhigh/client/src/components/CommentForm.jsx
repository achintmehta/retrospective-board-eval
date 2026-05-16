import { useState } from 'react';
import { emitWithAck } from '../socket.js';

export default function CommentForm({ cardId }) {
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
      await emitWithAck('add_comment', { cardId, content: trimmed });
      setContent('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Reply..."
        maxLength={500}
      />
      <button type="submit" disabled={!content.trim() || submitting}>
        Reply
      </button>
      {error && <p className="error small">{error}</p>}
    </form>
  );
}
