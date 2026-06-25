import { useState } from 'react';

export default function Card({ card, onAddComment }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  function submit(e) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddComment(card.id, trimmed);
    setDraft('');
  }

  return (
    <div className="card-item">
      <div className="card-content">{card.content}</div>
      <div className="card-footer">
        <span className="card-author">— {card.authorName}</span>
        <button
          type="button"
          className="link-btn"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Hide' : `Comments (${card.comments?.length || 0})`}
        </button>
      </div>
      {open && (
        <div className="card-comments">
          {(card.comments || []).map((c) => (
            <div key={c.id} className="comment-item">
              <div className="comment-content">{c.content}</div>
              <div className="comment-author">— {c.authorName}</div>
            </div>
          ))}
          <form onSubmit={submit} className="comment-form">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              maxLength={2000}
            />
            <button type="submit" disabled={!draft.trim()}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
}
