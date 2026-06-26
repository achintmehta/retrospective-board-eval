import { useEffect, useRef, useState } from 'react';

export default function CardModal({ card, onClose, onAddComment }) {
  const [content, setContent] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    // Scroll to the latest comment when new ones arrive.
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [card?.comments.length]);

  if (!card) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onAddComment(card.id, trimmed);
    setContent('');
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="modal wide"
        onClick={(e) => e.stopPropagation()}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <div>
            <h2>Card</h2>
            <p style={{ marginTop: '0.25rem' }}>
              By {card.author_name} •{' '}
              {new Date(card.created_at + 'Z').toLocaleString()}
            </p>
          </div>
          <button className="subtle" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '0.75rem',
            whiteSpace: 'pre-wrap',
          }}
        >
          {card.content}
        </div>

        <h3 style={{ margin: '0.5rem 0 0', fontSize: '1rem' }}>
          Comments ({card.comments.length})
        </h3>
        <div className="comments-list" ref={listRef}>
          {card.comments.length === 0 ? (
            <p className="empty">No comments yet.</p>
          ) : (
            card.comments.map((c) => (
              <div className="comment" key={c.id}>
                <div className="meta">
                  {c.author_name} •{' '}
                  {new Date(c.created_at + 'Z').toLocaleString()}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <textarea
            rows={2}
            placeholder="Add a comment…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="actions">
            <button type="submit" className="primary" disabled={!content.trim()}>
              Post comment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
