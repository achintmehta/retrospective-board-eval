import { useState, useEffect, useRef } from 'react';

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

export default function CardModal({ card, displayName, onClose, onAddComment }) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [card?.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!card) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    setSubmitting(true);
    setError('');
    try {
      await onAddComment(card.id, text);
      setValue('');
    } catch (err) {
      setError(err.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="card-modal-title">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="card-modal-title">Card details</h2>
          <button type="button" className="close-button" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 12 }}>
            <div className="card-content">{card.content}</div>
            <div className="card-meta" style={{ marginTop: 8 }}>
              <span className="author-pill">{card.author_name}</span>
              <span>{formatTime(card.created_at)}</span>
            </div>
          </div>

          <div className="comments-section">
            <h3>Comments ({card.comments?.length || 0})</h3>
            <div className="comment-list">
              {(card.comments || []).length === 0 ? (
                <p className="empty-state" style={{ padding: 12 }}>No comments yet</p>
              ) : (
                (card.comments || []).map((c) => (
                  <div key={c.id} className="comment">
                    <div className="comment-author">{c.author_name}</div>
                    <div className="comment-content">{c.content}</div>
                    <div className="comment-time">{formatTime(c.created_at)}</div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                className="textarea"
                placeholder={`Reply as ${displayName}…`}
                value={value}
                maxLength={2000}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmit(e);
                  }
                }}
              />
              {error && (
                <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: 4 }}>{error}</p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn"
                  disabled={submitting || !value.trim()}
                >
                  {submitting ? 'Adding…' : 'Add comment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
