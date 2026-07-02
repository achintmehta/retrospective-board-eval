import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

function initials(name) {
  return (name || 'G')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('');
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return 'just now';
  if (sec < 90) return '1m ago';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function CardModal({ card, onClose, onAddComment, currentUser }) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!card) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, onClose]);

  useEffect(() => {
    if (!card) setContent('');
  }, [card]);

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onAddComment(card.id, content.trim());
      setContent('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          key="overlay"
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="modal modal--card"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal__glow" aria-hidden="true" />
            <button
              type="button"
              className="modal__close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
            <div className="modal__head">
              <span className="modal__eyebrow">{card.columnTitle}</span>
              <p className="modal__body-text">{card.content}</p>
              <div className="modal__meta">
                <span className="avatar avatar--sm">{initials(card.author_name)}</span>
                <span>{card.author_name}</span>
                <span className="modal__sep">·</span>
                <span>{relativeTime(card.created_at)}</span>
              </div>
            </div>

            <div className="comments">
              <div className="comments__head">
                <h3>Comments</h3>
                <span className="pill">{card.comments?.length || 0}</span>
              </div>
              <ul className="comments__list">
                {(card.comments || []).map((c) => (
                  <li key={c.id} className="comment">
                    <div className="comment__avatar">
                      <span className="avatar avatar--sm">{initials(c.author_name)}</span>
                    </div>
                    <div className="comment__body">
                      <div className="comment__head-row">
                        <strong>{c.author_name}</strong>
                        <span className="comment__time">{relativeTime(c.created_at)}</span>
                      </div>
                      <div className="comment__text">{c.content}</div>
                    </div>
                  </li>
                ))}
                {(!card.comments || card.comments.length === 0) && (
                  <li className="comments__empty">No comments yet. Be the first.</li>
                )}
              </ul>

              <form className="comments__form" onSubmit={submit}>
                <span className="avatar avatar--sm">{initials(currentUser)}</span>
                <textarea
                  className="textarea"
                  placeholder="Add a comment…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={500}
                  rows={2}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(e);
                  }}
                />
                <button
                  type="submit"
                  className="btn btn--primary btn--sm"
                  disabled={submitting || !content.trim()}
                >
                  {submitting ? '…' : 'Reply'}
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
