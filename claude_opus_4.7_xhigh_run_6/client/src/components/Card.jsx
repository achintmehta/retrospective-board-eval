import { useState } from 'react';

export default function Card({ card, onAddComment }) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const comments = card.comments || [];

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    const ok = await onAddComment(card.id, trimmed);
    setSubmitting(false);
    if (ok) setDraft('');
  }

  return (
    <article className="card">
      <p className="card-content">{card.content}</p>
      <div className="card-meta">
        <span>{card.author_name}</span>
        <button
          type="button"
          className="link-button"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Hide' : 'Show'} comments ({comments.length})
        </button>
      </div>
      {expanded && (
        <div className="card-comments">
          {comments.length === 0 && (
            <p className="muted small">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <p className="comment-content">{c.content}</p>
              <p className="comment-meta">
                <strong>{c.author_name}</strong>{' '}
                <span className="muted small">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </p>
            </div>
          ))}
          <form onSubmit={handleSubmit} className="comment-form">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              maxLength={500}
              disabled={submitting}
              aria-label="New comment"
            />
            <button type="submit" disabled={submitting || !draft.trim()}>
              Reply
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
