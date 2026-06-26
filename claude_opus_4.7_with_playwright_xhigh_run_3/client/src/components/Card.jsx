import { useState } from 'react';

export default function Card({ card, onAddComment }) {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const comments = card.comments || [];

  async function handleComment(e) {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(card.id, trimmed);
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card-item">
      <p className="card-content">{card.content}</p>
      <div className="card-meta">
        <span>{card.author_name}</span>
        <button
          type="button"
          className="link-button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          💬 {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </button>
      </div>
      {expanded && (
        <div className="comments">
          {comments.length === 0 ? (
            <p className="muted">No comments yet.</p>
          ) : (
            <ul>
              {comments.map((c) => (
                <li key={c.id}>
                  <strong>{c.author_name}:</strong> {c.content}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleComment} className="comment-form">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment…"
              maxLength={500}
              aria-label="Comment text"
            />
            <button type="submit" disabled={!commentText.trim() || submitting}>
              {submitting ? '…' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
