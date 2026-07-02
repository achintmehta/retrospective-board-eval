import { useState } from 'react';

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    background: 'var(--bg-modal)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '28px',
    width: '100%',
    maxWidth: 480,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-lg)',
    animation: 'slideUp 0.3s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 16,
    transition: 'all var(--transition)',
  },
  cardPreview: {
    padding: '14px 16px',
    background: 'var(--bg-primary)',
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    color: 'var(--text-primary)',
    marginBottom: 20,
    borderLeft: '3px solid var(--accent)',
  },
  commentsList: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  comment: {
    padding: '12px 14px',
    background: 'var(--bg-primary)',
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--accent)',
    marginBottom: 4,
  },
  commentContent: {
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  },
  commentTime: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 4,
  },
  emptyComments: {
    textAlign: 'center',
    padding: '24px 0',
    color: 'var(--text-muted)',
    fontSize: 14,
  },
  form: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: 14,
    transition: 'border-color var(--transition), box-shadow var(--transition)',
  },
  submitBtn: {
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #6c5ce7, #5a4bd1)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform var(--transition), box-shadow var(--transition)',
    whiteSpace: 'nowrap',
  },
};

export default function CommentModal({ card, onClose, onAddComment }) {
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAddComment(card.id, content.trim());
    setContent('');
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Comments</h3>
          <button
            style={styles.closeBtn}
            onClick={onClose}
            onMouseEnter={(e) => { e.target.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'var(--bg-primary)'; }}
          >
            &times;
          </button>
        </div>

        <div style={styles.cardPreview}>{card.content}</div>

        <div style={styles.commentsList}>
          {(!card.comments || card.comments.length === 0) ? (
            <div style={styles.emptyComments}>No comments yet. Start the conversation!</div>
          ) : (
            card.comments.map((comment) => (
              <div key={comment.id} style={styles.comment}>
                <div style={styles.commentAuthor}>{comment.author_name}</div>
                <div style={styles.commentContent}>{comment.content}</div>
                <div style={styles.commentTime}>
                  {new Date(comment.created_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <input
            style={styles.input}
            type="text"
            placeholder="Add a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--border-focus)';
              e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            style={styles.submitBtn}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 12px rgba(108, 92, 231, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
