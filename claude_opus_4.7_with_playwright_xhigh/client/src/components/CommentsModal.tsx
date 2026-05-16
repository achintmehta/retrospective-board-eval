import { FormEvent, useState } from 'react';
import type { Card } from '../types';

interface Props {
  card: Card;
  onClose: () => void;
  onAddComment: (content: string) => void;
}

export default function CommentsModal({ card, onClose, onAddComment }: Props) {
  const [content, setContent] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setContent('');
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="modal-header">
          <h2>Card details</h2>
          <button
            type="button"
            className="ghost icon"
            onClick={onClose}
            aria-label="Close"
          >
            x
          </button>
        </header>

        <div className="card-detail">
          <p className="card-detail-content">{card.content}</p>
          <p className="muted">
            Added by {card.author_name} ·{' '}
            {new Date(card.created_at + 'Z').toLocaleString()}
          </p>
        </div>

        <h3>Comments ({card.comments.length})</h3>
        <ul className="comment-list">
          {card.comments.length === 0 && (
            <li className="muted">No comments yet — be the first to reply.</li>
          )}
          {card.comments.map((comment) => (
            <li key={comment.id} className="comment-item">
              <div className="comment-meta">
                <strong>{comment.author_name}</strong>
                <span className="muted">
                  {new Date(comment.created_at + 'Z').toLocaleString()}
                </span>
              </div>
              <p>{comment.content}</p>
            </li>
          ))}
        </ul>

        <form className="add-comment-form" onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment…"
            rows={2}
            maxLength={500}
          />
          <button type="submit" disabled={!content.trim()}>
            Add comment
          </button>
        </form>
      </div>
    </div>
  );
}
