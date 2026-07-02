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
    animation: 'fadeIn 0.2s ease-out',
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    width: '100%',
    maxWidth: 520,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-lg)',
    animation: 'scaleIn 0.2s ease-out',
  },
  header: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardContent: {
    fontSize: '1rem',
    color: 'var(--text-primary)',
    lineHeight: 1.6,
    flex: 1,
  },
  cardAuthor: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: 6,
  },
  closeBtn: {
    background: 'var(--bg-card)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    borderRadius: '50%',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    flexShrink: 0,
    marginLeft: 12,
    cursor: 'pointer',
  },
  comments: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
  },
  commentsLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'var(--text-muted)',
    marginBottom: 12,
  },
  comment: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-xs)',
    padding: '12px 14px',
    marginBottom: 8,
    animation: 'fadeIn 0.2s ease-out',
  },
  commentContent: {
    fontSize: '0.88rem',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  },
  commentMeta: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: 6,
  },
  noComments: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    textAlign: 'center',
    padding: '16px 0',
  },
  addCommentArea: {
    padding: '12px 24px 20px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    padding: '10px 14px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  sendBtn: {
    padding: '10px 20px',
    background: 'var(--gradient-accent)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.82rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    whiteSpace: 'nowrap',
  },
};

export default function CardModal({ card, onClose, onAddComment, userName }) {
  const [commentText, setCommentText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(card.id, commentText.trim());
    setCommentText('');
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr + 'Z');
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.cardContent}>{card.content}</div>
            <div style={styles.cardAuthor}>by {card.author_name}</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div style={styles.comments}>
          <div style={styles.commentsLabel}>
            Comments ({card.comments?.length || 0})
          </div>
          {(!card.comments || card.comments.length === 0) ? (
            <div style={styles.noComments}>No comments yet. Be the first to share your thoughts.</div>
          ) : (
            card.comments.map((comment) => (
              <div key={comment.id} style={styles.comment}>
                <div style={styles.commentContent}>{comment.content}</div>
                <div style={styles.commentMeta}>
                  {comment.author_name} &middot; {formatTime(comment.created_at)}
                </div>
              </div>
            ))
          )}
        </div>

        <form style={styles.addCommentArea} onSubmit={handleSubmit}>
          <input
            style={styles.commentInput}
            type="text"
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            autoFocus
          />
          <button type="submit" style={styles.sendBtn}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
