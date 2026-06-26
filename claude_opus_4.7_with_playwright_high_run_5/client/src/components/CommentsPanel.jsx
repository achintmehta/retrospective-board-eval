import { useState } from 'react';

export default function CommentsPanel({ card, onClose, onAddComment }) {
  const [text, setText] = useState('');

  function submit(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onAddComment(card.id, value);
    setText('');
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal comments-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>Card</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="card-preview">
          <p className="card-content">{card.content}</p>
          <p className="muted">by {card.authorName}</p>
        </div>
        <h4>Comments ({card.comments.length})</h4>
        <ul className="comments-list">
          {card.comments.length === 0 && (
            <li className="muted">No comments yet.</li>
          )}
          {card.comments.map((c) => (
            <li key={c.id}>
              <p className="comment-body">{c.content}</p>
              <p className="muted small">
                {c.authorName} · {new Date(c.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
        <form onSubmit={submit} className="comment-form">
          <textarea
            placeholder="Add a comment…"
            value={text}
            maxLength={4000}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
          <button type="submit" disabled={!text.trim()}>Post comment</button>
        </form>
      </div>
    </div>
  );
}
