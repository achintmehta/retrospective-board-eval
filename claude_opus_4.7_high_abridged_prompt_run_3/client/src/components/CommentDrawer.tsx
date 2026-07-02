import { FormEvent, useState } from 'react';
import type { Card, Comment } from '../api';

interface Props {
  card: Card & { comments: Comment[]; columnTitle: string };
  onClose: () => void;
  onAddComment: (cardId: string, content: string) => void;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function authorInitial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}

export default function CommentDrawer({ card, onClose, onAddComment }: Props) {
  const [text, setText] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddComment(card.id, trimmed);
    setText('');
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="drawer-head">
          <div>
            <span className="drawer-eyebrow">{card.columnTitle}</span>
            <h3 className="drawer-title">Card discussion</h3>
          </div>
          <button className="btn btn-ghost drawer-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <section className="drawer-card">
          <p className="drawer-card-content">{card.content}</p>
          <div className="drawer-card-meta">
            <span className="author-avatar">
              {authorInitial(card.author_name)}
            </span>
            <span>{card.author_name}</span>
            <span className="dot" />
            <span>{timeAgo(card.created_at)}</span>
          </div>
        </section>

        <div className="comments-list">
          <div className="comments-head">
            <h4>Comments</h4>
            <span className="badge">{card.comments.length}</span>
          </div>
          {card.comments.length === 0 ? (
            <p className="comments-empty">No comments yet. Start the conversation.</p>
          ) : (
            card.comments.map((c) => (
              <div key={c.id} className="comment">
                <span className="author-avatar">{authorInitial(c.author_name)}</span>
                <div className="comment-body">
                  <div className="comment-head">
                    <strong>{c.author_name}</strong>
                    <span className="comment-time">{timeAgo(c.created_at)}</span>
                  </div>
                  <p>{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="drawer-composer">
          <textarea
            className="textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={500}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
            Send
          </button>
        </form>
      </aside>
    </div>
  );
}
