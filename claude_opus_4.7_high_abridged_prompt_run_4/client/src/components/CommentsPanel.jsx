import { useEffect, useState } from 'react';

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function formatTime(ms) {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CommentsPanel({ card, onClose, onAddComment }) {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft('');
  }, [card?.id]);

  if (!card) return null;

  function submit(e) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    onAddComment(card.id, content);
    setDraft('');
  }

  return (
    <aside className="drawer" role="dialog" aria-modal="true">
      <div className="drawer-scrim" onClick={onClose} />
      <div className="drawer-panel">
        <div className="drawer-head">
          <div>
            <div className="drawer-eyebrow">Card thread</div>
            <div className="drawer-title">{card.content}</div>
            <div className="drawer-sub">
              <span className="avatar-chip small" aria-hidden>
                {initials(card.author_name)}
              </span>
              {card.author_name} · {formatTime(card.created_at)}
            </div>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="drawer-body">
          {card.comments.length === 0 ? (
            <div className="comments-empty">
              No replies yet. Kick off the discussion below.
            </div>
          ) : (
            <ul className="comment-list">
              {card.comments.map((c) => (
                <li key={c.id} className="comment">
                  <span className="avatar-chip small" aria-hidden>
                    {initials(c.author_name)}
                  </span>
                  <div className="comment-body">
                    <div className="comment-meta">
                      <span className="comment-author">{c.author_name}</span>
                      <span className="comment-time">
                        {formatTime(c.created_at)}
                      </span>
                    </div>
                    <div className="comment-text">{c.content}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className="drawer-composer" onSubmit={submit}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Reply to this card…"
            maxLength={2000}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
            }}
          />
          <button className="btn primary" disabled={!draft.trim()}>
            Post reply
          </button>
        </form>
      </div>
    </aside>
  );
}
