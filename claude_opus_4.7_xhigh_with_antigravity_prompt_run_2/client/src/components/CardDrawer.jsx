import { useEffect, useRef, useState } from 'react';
import { colorForName, initials } from '../lib/session.js';
import { formatRelative } from '../lib/format.js';

export default function CardDrawer({ card, open, onClose, onAddComment }) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      const t = setTimeout(() => textareaRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, card?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!card) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value) return;
    onAddComment(card.id, value);
    setDraft('');
  };

  const accent = colorForName(card.author_name);
  const commentCount = card.comments?.length ?? 0;

  return (
    <>
      <div
        className={`drawer-backdrop ${open ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`drawer ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <header className="drawer-header">
          <div className="drawer-title-row">
            <span className="avatar avatar-lg" style={{ background: accent }}>
              {initials(card.author_name)}
            </span>
            <div>
              <p id="drawer-title" className="drawer-author">{card.author_name}</p>
              <p className="drawer-time">{formatRelative(card.created_at)}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm drawer-close"
            onClick={onClose}
            aria-label="Close card"
          >
            ✕
          </button>
        </header>
        <div className="drawer-content">
          <p className="drawer-card-text">{card.content}</p>
        </div>
        <section className="drawer-comments">
          <h3 className="drawer-section-title">
            Comments
            <span className="drawer-count">{commentCount}</span>
          </h3>
          {commentCount === 0 ? (
            <p className="drawer-empty">No comments yet. Be the first to chime in.</p>
          ) : (
            <ul className="comments-list">
              {card.comments.map((comment) => {
                const cAccent = colorForName(comment.author_name);
                return (
                  <li key={comment.id} className="comment-item">
                    <span className="avatar avatar-sm" style={{ background: cAccent }}>
                      {initials(comment.author_name)}
                    </span>
                    <div className="comment-body">
                      <div className="comment-meta">
                        <strong>{comment.author_name}</strong>
                        <span>{formatRelative(comment.created_at)}</span>
                      </div>
                      <p className="comment-text">{comment.content}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <form className="drawer-form" onSubmit={handleSubmit}>
          <label className="label" htmlFor="comment-input">Add a comment</label>
          <textarea
            ref={textareaRef}
            id="comment-input"
            className="textarea"
            value={draft}
            maxLength={1000}
            placeholder="Add context, reactions, or follow-ups…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit(e);
              }
            }}
          />
          <div className="drawer-form-actions">
            <span className="kbd">⌘ + Enter</span>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>
              Post comment
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
