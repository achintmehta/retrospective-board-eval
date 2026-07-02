import { useState, type FormEvent } from 'react';
import type { Card, Comment } from '../api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

type Props = {
  card: Card;
  accent: string;
  onClose: () => void;
  onAddComment: (content: string) => void;
};

export function CardDetailModal({ card, accent, onClose, onAddComment }: Props) {
  const [comment, setComment] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = comment.trim();
    if (!value) return;
    onAddComment(value);
    setComment('');
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal modal-wide" data-accent={accent}>
        <div className="modal-header">
          <div>
            <span className="board-eyebrow" style={{ marginBottom: 6 }}>
              Card by {card.author_name}
            </span>
            <h2 className="modal-title">Discussion</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="card-detail-preview">{card.content}</div>

        <h3
          className="field-label"
          style={{ marginBottom: 10, display: 'block' }}
        >
          Comments ({card.comments.length})
        </h3>

        {card.comments.length === 0 ? (
          <div className="comment-empty">No comments yet. Start the thread.</div>
        ) : (
          <div className="comment-list">
            {card.comments.map((c: Comment) => (
              <div key={c.id} className="comment">
                <div className="comment-head">
                  <span className="comment-author">
                    <span className="who-avatar">
                      {initials(c.author_name) || '?'}
                    </span>
                    {c.author_name}
                  </span>
                  <span>{timeAgo(c.created_at)}</span>
                </div>
                <p className="comment-body">{c.content}</p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={submit} style={{ marginTop: 18 }}>
          <textarea
            className="textarea"
            placeholder="Add a comment…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
            }}
            maxLength={1000}
          />
          <div className="modal-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!comment.trim()}
            >
              Post comment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
