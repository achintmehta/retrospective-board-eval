import { useEffect, useRef, useState } from 'react';
import { initials } from '../lib/identity';

function formatTime(ts) {
  return new Date(ts).toLocaleString();
}

export default function CardDetailModal({ card, columnTitle, comments, onAddComment, onClose }) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  const submit = async (e) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      await onAddComment(card.id, content);
      setDraft('');
      textareaRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="card-detail-title">
        <div>
          <div className="card-detail-meta">
            <span>{columnTitle}</span>
            <span>·</span>
            <span>by {card.author_name}</span>
            <span>·</span>
            <span>{formatTime(card.created_at)}</span>
          </div>
          <h2 id="card-detail-title" style={{ marginTop: 6 }}>Card detail</h2>
        </div>

        <div className="modal-body" ref={scrollRef}>
          <div className="card-detail-content">{card.content}</div>

          <div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '0.92rem' }}>Comments</strong>
              <span className="dim" style={{ fontSize: '0.78rem' }}>{comments.length}</span>
            </div>
            <div className="comment-list" style={{ marginTop: 8 }}>
              {comments.length === 0 ? (
                <div className="comment-empty">No comments yet — be the first.</div>
              ) : (
                comments.map((c) => (
                  <div className="comment-row" key={c.id}>
                    <div className="row-head">
                      <span className="row-author">
                        <span className="avatar" aria-hidden>{initials(c.author_name)}</span>
                        {c.author_name}
                      </span>
                      <span>{formatTime(c.created_at)}</span>
                    </div>
                    <div className="row-content">{c.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <form className="add-comment-row" onSubmit={submit}>
          <textarea
            ref={textareaRef}
            id="new-comment-input"
            className="textarea"
            placeholder="Add a comment…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
            }}
            maxLength={2000}
          />
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
            <button
              type="submit"
              id="submit-comment-button"
              className="btn btn-primary"
              disabled={!draft.trim() || submitting}
            >
              {submitting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
