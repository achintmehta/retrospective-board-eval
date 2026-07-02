import { useEffect, useRef, useState } from 'react';
import { formatRelative, initials, colorFor } from '../lib/format.js';

export default function CardDetailDrawer({ card, onClose, onAddComment }) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!card) return null;

  const [cf, ct] = colorFor(card.author_name);

  function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddComment(card.id, text);
    setDraft('');
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="drawer-close"
          onClick={onClose}
          aria-label="Close card details"
        >
          ×
        </button>

        <div className="drawer-eyebrow">Card</div>
        <p className="drawer-content">{card.content}</p>

        <div className="drawer-author">
          <span
            className="avatar avatar-lg"
            style={{ background: `linear-gradient(135deg, ${cf}, ${ct})` }}
          >
            {initials(card.author_name)}
          </span>
          <div>
            <div className="drawer-author-name">{card.author_name}</div>
            <div className="drawer-author-time">
              {formatRelative(card.created_at)}
            </div>
          </div>
        </div>

        <div className="drawer-divider" />

        <div className="comments-head">
          <h3>Comments</h3>
          <span className="section-count">
            {card.comments?.length || 0}
          </span>
        </div>

        <div className="comments-list">
          {(card.comments || []).length === 0 ? (
            <p className="comments-empty">
              No comments yet. Add the first thought below.
            </p>
          ) : (
            card.comments.map((c) => {
              const [f, t] = colorFor(c.author_name);
              return (
                <div key={c.id} className="comment">
                  <span
                    className="avatar avatar-sm"
                    style={{
                      background: `linear-gradient(135deg, ${f}, ${t})`,
                    }}
                  >
                    {initials(c.author_name)}
                  </span>
                  <div className="comment-body">
                    <div className="comment-head">
                      <span className="comment-author">{c.author_name}</span>
                      <span className="comment-time">
                        {formatRelative(c.created_at)}
                      </span>
                    </div>
                    <p className="comment-text">{c.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form className="comment-form" onSubmit={submit}>
          <textarea
            ref={inputRef}
            className="comment-input"
            placeholder="Reply to this card…"
            rows={3}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
            }}
          />
          <div className="comment-form-actions">
            <span className="hint">⌘/Ctrl + Enter to send</span>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!draft.trim()}
            >
              Post comment
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
