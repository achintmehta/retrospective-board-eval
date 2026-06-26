import { useState } from 'react';

export default function Card({ card, onAddComment }) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');

  function submit(e) {
    e.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) return;
    onAddComment(card.id, trimmed);
    setComment('');
  }

  return (
    <div className="retro-card">
      <p className="card-content">{card.content}</p>
      <div className="card-meta">
        <span className="card-author">{card.author_name}</span>
        <button
          type="button"
          className="link-btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {card.comments.length} comment{card.comments.length === 1 ? '' : 's'}
        </button>
      </div>
      {open && (
        <div className="comments">
          <ul>
            {card.comments.map((c) => (
              <li key={c.id}>
                <strong>{c.author_name}:</strong> {c.content}
              </li>
            ))}
          </ul>
          <form onSubmit={submit} className="comment-form">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment…"
              aria-label="Comment"
            />
            <button type="submit" className="btn btn-secondary" disabled={!comment.trim()}>
              Reply
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
