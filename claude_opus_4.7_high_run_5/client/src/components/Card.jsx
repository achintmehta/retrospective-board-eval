import { useState } from 'react';

export default function Card({ card, onAddComment }) {
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState('');

  function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddComment(card.id, text);
    setDraft('');
  }

  return (
    <div className="card">
      <div className="card-content">{card.content}</div>
      <div className="card-meta">
        <span className="author">— {card.author_name}</span>
        <button
          type="button"
          className="link"
          onClick={() => setShowComments((v) => !v)}
        >
          {card.comments.length > 0
            ? `${card.comments.length} comment${card.comments.length === 1 ? '' : 's'}`
            : 'Add comment'}
          {showComments ? ' ▴' : ' ▾'}
        </button>
      </div>

      {showComments && (
        <div className="comments">
          {card.comments.map((c) => (
            <div className="comment" key={c.id}>
              <div className="comment-content">{c.content}</div>
              <div className="comment-meta">— {c.author_name}</div>
            </div>
          ))}
          <form onSubmit={submit} className="comment-form">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Reply…"
              maxLength={1000}
              aria-label="New comment"
            />
            <button type="submit" disabled={!draft.trim()}>
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
