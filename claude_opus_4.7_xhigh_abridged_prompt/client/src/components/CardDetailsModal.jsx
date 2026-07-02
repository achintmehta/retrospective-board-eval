import { useEffect, useMemo, useRef, useState } from 'react';
import { avatarGradient, initials, formatRelative } from '../lib/identity.js';

export default function CardDetailsModal({ card, comments, onClose, onAddComment }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sorted = useMemo(
    () => [...comments].sort((a, b) => a.createdAt - b.createdAt),
    [comments],
  );

  const submit = async (event) => {
    event.preventDefault();
    const clean = text.trim();
    if (!clean || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(clean);
      setText('');
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Card details"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal modal-lg" style={{ position: 'relative' }}>
        <button className="btn btn-icon modal-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12" /><path d="M18 6l-12 12" /></svg>
        </button>

        <div className="card-preview">
          {card.content}
        </div>
        <div className="row gap-2 text-3" style={{ fontSize: 12 }}>
          <span
            className="card-mini-avatar"
            style={{ background: avatarGradient(card.authorName) }}
          >
            {initials(card.authorName)}
          </span>
          <span>{card.authorName}</span>
          <span>•</span>
          <span>{formatRelative(card.createdAt)}</span>
        </div>

        <h2 style={{ fontSize: 16, marginTop: 20, marginBottom: 8 }}>
          Comments <span style={{ color: 'var(--text-3)', fontWeight: 600, fontSize: 13 }}>({sorted.length})</span>
        </h2>

        <div className="comment-list">
          {sorted.length === 0 ? (
            <div className="comment-empty">No comments yet. Start the discussion below.</div>
          ) : (
            sorted.map((c) => (
              <div key={c.id} className="comment">
                <span
                  className="avatar"
                  style={{ background: avatarGradient(c.authorName), width: 30, height: 30, border: 'none', fontSize: 12 }}
                >
                  {initials(c.authorName)}
                </span>
                <div className="comment-body">
                  <div className="comment-head">
                    <span className="comment-author">{c.authorName}</span>
                    <span className="comment-time">{formatRelative(c.createdAt)}</span>
                  </div>
                  <p className="comment-text">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={submit} className="stack gap-3">
          <textarea
            ref={inputRef}
            className="textarea"
            placeholder="Reply with your thoughts…"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={1000}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit(event);
            }}
          />
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !text.trim()}>
              {submitting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
