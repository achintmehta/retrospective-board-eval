import { FormEvent, useState } from 'react';
import type { Card } from '../types';
import { colorFor, initials, formatTime } from '../ui';

interface Props {
  card: Card;
  displayName: string;
  onClose: () => void;
  onAddComment: (cardId: string, content: string) => void;
}

export default function CardDetailModal({
  card,
  displayName,
  onClose,
  onAddComment,
}: Props) {
  const [text, setText] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddComment(card.id, trimmed);
    setText('');
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal modal-large">
        <div className="modal-inner">
          <div className="card-detail-header">
            <div>
              <div className="card-detail-tag">card</div>
              <div className="card-detail-content">{card.content}</div>
              <div className="card-detail-meta">
                by {card.author_name} · {formatTime(card.created_at)}
              </div>
            </div>
            <button
              className="close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1L13 13M13 1L1 13"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="comments-title">
            Comments <span className="count">{card.comments.length}</span>
          </div>

          {card.comments.length === 0 ? (
            <div className="comment-empty">
              No comments yet — be the first to reply.
            </div>
          ) : (
            <div className="comment-list">
              {card.comments.map((c) => (
                <div key={c.id} className="comment">
                  <div className="comment-head">
                    <span
                      className="card-avatar"
                      style={{ background: colorFor(c.author_name) }}
                    >
                      {initials(c.author_name)}
                    </span>
                    <span className="comment-author">{c.author_name}</span>
                    <span className="comment-time">
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  <div className="comment-body">{c.content}</div>
                </div>
              ))}
            </div>
          )}

          <form className="comment-form" onSubmit={handleSubmit}>
            <textarea
              placeholder={`Reply as ${displayName}…`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
            />
            <div className="comment-form-row">
              <button
                type="submit"
                className="primary-btn"
                disabled={!text.trim()}
              >
                Post comment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
