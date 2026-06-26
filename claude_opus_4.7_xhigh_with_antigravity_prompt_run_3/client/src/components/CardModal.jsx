import { useEffect, useRef, useState } from 'react';
import { initialsOf } from '../session.js';

export default function CardModal({ card, columnTitle, comments, onAddComment, onClose }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    // auto-scroll comments to bottom when a new one arrives
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(trimmed);
      setText('');
      textareaRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="card-modal-title" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-subtitle">{columnTitle}</div>
            <div className="modal-title" id="card-modal-title">Card details</div>
          </div>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Close card details" id="card-modal-close">×</button>
        </div>
        <div className="modal-body">
          <div className="detail-card">
            {card.content}
            <div className="detail-card-meta">
              <span className="card-author">
                <span className="author-mini">{initialsOf(card.author_name)}</span>
                {card.author_name || 'Anonymous'}
              </span>
              <span>{formatTime(card.created_at)}</span>
            </div>
          </div>

          <div className="section-label">
            Comments
            <span className="count">{comments.length}</span>
          </div>
          <div className="comments" ref={scrollRef} id="card-comments-list">
            {comments.length === 0 ? (
              <div className="banner is-info">No comments yet. Be the first to weigh in.</div>
            ) : comments.map((c) => (
              <div className="comment" key={c.id}>
                <span className="author-mini" aria-hidden="true">{initialsOf(c.author_name)}</span>
                <div className="comment-body">
                  <div className="comment-head">
                    <span className="comment-author">{c.author_name || 'Anonymous'}</span>
                    <span className="comment-time">{formatTime(c.created_at)}</span>
                  </div>
                  <div className="comment-text">{c.content}</div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="comment-form" id="add-comment-form">
            <textarea
              ref={textareaRef}
              className="textarea"
              placeholder="Add a comment…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit(e);
                }
              }}
            />
            <div className="comment-form-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} id="card-modal-cancel">Close</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim() || submitting} id="add-comment-submit">
                {submitting ? 'Posting…' : 'Post comment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
