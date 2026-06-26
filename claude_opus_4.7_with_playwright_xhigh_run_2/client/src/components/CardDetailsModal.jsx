import React, { useEffect, useState } from 'react';

export default function CardDetailsModal({ card, column, comments, onClose, onAddComment }) {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    await onAddComment(draft.trim());
    setDraft('');
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>{card.content}</h2>
            <p className="muted">
              {column ? column.title : 'Unknown column'} · by {card.author_name}
            </p>
          </div>
          <button type="button" className="link-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <section className="comments">
          <h3>Comments</h3>
          {comments.length === 0 ? (
            <p className="muted">No comments yet. Start the conversation.</p>
          ) : (
            <ul className="comment-list">
              {comments.map((c) => (
                <li key={c.id} className="comment">
                  <p className="comment-content">{c.content}</p>
                  <p className="comment-meta">— {c.author_name}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form className="comment-form" onSubmit={handleSubmit}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            maxLength={1000}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
            }}
          />
          <button type="submit" disabled={!draft.trim()}>
            Add comment
          </button>
        </form>
      </div>
    </div>
  );
}
