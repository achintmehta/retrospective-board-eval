import { useState } from 'react';
import type { Card } from '../types';

interface Props {
  card: Card;
  onAddComment: (cardId: string, content: string) => void;
}

export function CardItem({ card, onAddComment }: Props) {
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState('');

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddComment(card.id, trimmed);
    setDraft('');
  }

  const commentCount = card.comments?.length ?? 0;

  return (
    <div className="card">
      <div className="card-content">{card.content}</div>
      <div className="card-meta">
        <span className="card-author">— {card.author_name}</span>
        <button
          type="button"
          className="link-btn"
          onClick={() => setShowComments((v) => !v)}
        >
          {showComments
            ? 'Hide comments'
            : `${commentCount > 0 ? `Comments (${commentCount})` : 'Add comment'}`}
        </button>
      </div>

      {showComments && (
        <div className="comments">
          {commentCount > 0 ? (
            <ul className="comment-list">
              {card.comments.map((c) => (
                <li key={c.id} className="comment">
                  <div className="comment-content">{c.content}</div>
                  <div className="comment-meta">— {c.author_name}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">No comments yet.</p>
          )}
          <form className="comment-form" onSubmit={submitComment}>
            <input
              type="text"
              placeholder="Write a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
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
