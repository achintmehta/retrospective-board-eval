import { useEffect, useState, useRef } from 'react';

function relativeTime(ms) {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ms).toLocaleString();
}

function avatarColor(name) {
  const hue = [...(name || 'Guest')].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  return `hsl(${hue} 75% 60%)`;
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CardDetailModal({
  card,
  column,
  comments,
  onClose,
  onAddComment,
  currentUser,
}) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const composerRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(content);
      setDraft('');
      composerRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-modal-title"
      onClick={onClose}
    >
      <div className="modal modal--card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close card"
        >
          ×
        </button>
        <div className="modal-body">
          {column && (
            <div className="modal-eyebrow modal-eyebrow--accent">
              <span className="dot" aria-hidden="true" /> {column.title}
            </div>
          )}
          <h2 id="card-modal-title" className="modal-title modal-title--card">
            {card.content}
          </h2>
          <div className="modal-author">
            <span
              className="avatar avatar--lg"
              style={{ background: avatarColor(card.author_name) }}
              aria-hidden="true"
            >
              {initials(card.author_name)}
            </span>
            <div>
              <div className="modal-author-name">{card.author_name}</div>
              <div className="modal-author-meta">added {relativeTime(card.created_at)}</div>
            </div>
          </div>

          <section className="comments-section">
            <h3 className="comments-title">
              Comments{' '}
              <span className="comments-count">{comments.length}</span>
            </h3>

            {comments.length === 0 ? (
              <div className="comments-empty">
                No comments yet. Start the conversation.
              </div>
            ) : (
              <ul className="comments-list" id={`comments-${card.id}`}>
                {comments.map((c) => (
                  <li key={c.id} className="comment" id={`comment-${c.id}`}>
                    <span
                      className="avatar"
                      style={{ background: avatarColor(c.author_name) }}
                      aria-hidden="true"
                    >
                      {initials(c.author_name)}
                    </span>
                    <div className="comment-body">
                      <div className="comment-meta">
                        <span className="comment-author">{c.author_name}</span>
                        <span className="comment-time">{relativeTime(c.created_at)}</span>
                      </div>
                      <p className="comment-content">{c.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form className="comment-composer" onSubmit={submit}>
              <span
                className="avatar"
                style={{ background: avatarColor(currentUser) }}
                aria-hidden="true"
              >
                {initials(currentUser)}
              </span>
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Reply as ${currentUser || 'Guest'}…`}
                rows={2}
                maxLength={500}
                disabled={submitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    submit(e);
                  }
                }}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                id={`add-comment-${card.id}`}
                disabled={!draft.trim() || submitting}
              >
                {submitting ? 'Posting…' : 'Comment'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
