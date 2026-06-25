import { useState } from 'react'

function CardDetail({ card, onClose, onAddComment }) {
  const [commentText, setCommentText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    onAddComment(card.id, commentText.trim())
    setCommentText('')
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Card Details</h2>
          <button onClick={onClose} style={styles.closeBtn}>X</button>
        </div>

        <div style={styles.content}>
          <p style={styles.cardText}>{card.content}</p>
          <div style={styles.meta}>
            <span>By {card.author_name}</span>
            <span>{new Date(card.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div style={styles.commentsSection}>
          <h3 style={styles.commentsTitle}>
            Comments ({card.comments ? card.comments.length : 0})
          </h3>

          <div style={styles.commentsList}>
            {card.comments && card.comments.map(comment => (
              <div key={comment.id} style={styles.comment}>
                <div style={styles.commentHeader}>
                  <strong>{comment.author_name}</strong>
                  <span style={styles.commentDate}>
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
                <p style={styles.commentText}>{comment.content}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              rows={2}
              style={styles.textarea}
            />
            <button type="submit" style={styles.submitBtn}>Comment</button>
          </form>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--surface)',
    borderRadius: 12,
    width: 500,
    maxWidth: '90%',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: 16,
    color: 'var(--text-muted)',
    padding: '4px 8px',
  },
  content: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
  },
  cardText: {
    fontSize: 16,
    lineHeight: 1.5,
    margin: 0,
    wordBreak: 'break-word',
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 12,
    fontSize: 13,
    color: 'var(--text-muted)',
  },
  commentsSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '16px 24px 20px',
  },
  commentsTitle: {
    fontSize: 15,
    fontWeight: 600,
    margin: '0 0 12px',
  },
  commentsList: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: 12,
  },
  comment: {
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    fontSize: 13,
  },
  commentDate: {
    color: 'var(--text-muted)',
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 1.5,
    margin: 0,
    wordBreak: 'break-word',
  },
  form: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    padding: 10,
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 14,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },
  submitBtn: {
    padding: '10px 16px',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
}

export default CardDetail
