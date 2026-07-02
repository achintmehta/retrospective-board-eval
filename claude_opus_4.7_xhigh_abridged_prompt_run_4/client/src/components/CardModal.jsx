import { useEffect, useState } from 'react';

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

function timeAgo(iso) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

export default function CardModal({ card, onClose, onAddComment }) {
  const [comment, setComment] = useState('');

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    onAddComment(comment);
    setComment('');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-glow" aria-hidden="true" />
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="card-modal-header">
          <span className="column-tag">{card.columnTitle}</span>
          <h3 className="card-modal-title">{card.content}</h3>
          <div className="card-modal-meta">
            <span className="card-author">
              <span className="avatar">{initials(card.author_name)}</span>
              {card.author_name}
            </span>
            <span className="card-modal-time">{timeAgo(card.created_at)}</span>
          </div>
        </div>

        <div className="card-modal-comments">
          <h4 className="comments-heading">
            Comments <span className="badge badge-soft">{card.comments?.length || 0}</span>
          </h4>
          {(card.comments || []).length === 0 ? (
            <div className="comments-empty">No comments yet — start the thread.</div>
          ) : (
            <ul className="comments-list">
              {card.comments.map((c) => (
                <li key={c.id} className="comment">
                  <span className="avatar avatar-sm">{initials(c.author_name)}</span>
                  <div className="comment-body">
                    <div className="comment-head">
                      <strong>{c.author_name}</strong>
                      <span className="comment-time">{timeAgo(c.created_at)}</span>
                    </div>
                    <div className="comment-text">{c.content}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className="comment-form" onSubmit={submit}>
          <input
            className="text-input"
            placeholder="Reply to this card…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!comment.trim()}>
            Post
          </button>
        </form>
      </div>
    </div>
  );
}
