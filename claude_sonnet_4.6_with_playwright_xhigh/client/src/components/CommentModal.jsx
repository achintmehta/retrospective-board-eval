import { useState } from 'react';

export default function CommentModal({ card, comments, onAddComment, onClose }) {
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAddComment(card.id, content.trim());
    setContent('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '1.5rem',
        width: 500,
        maxWidth: '95vw',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, marginRight: '1rem' }}>
            <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{card.content}</p>
            <p style={{ color: '#999', fontSize: '0.8rem' }}>by {card.author_name}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#999', lineHeight: 1, padding: '0.125rem' }}
          >
            ✕
          </button>
        </div>

        <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#666', marginBottom: '0.75rem' }}>
          Comments ({comments.length})
        </h4>

        <div style={{ marginBottom: '1rem' }}>
          {comments.length === 0 ? (
            <p style={{ color: '#bbb', fontSize: '0.875rem', fontStyle: 'italic' }}>No comments yet. Be the first!</p>
          ) : (
            comments.map(cm => (
              <div
                key={cm.id}
                style={{
                  background: '#f5f6f8',
                  borderRadius: 6,
                  padding: '0.5rem 0.75rem',
                  marginBottom: '0.5rem',
                }}
              >
                <p style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>{cm.content}</p>
                <p style={{ color: '#aaa', fontSize: '0.75rem' }}>— {cm.author_name}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Add a comment..."
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              border: '1.5px solid #e0e0e0',
              borderRadius: 6,
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
}
