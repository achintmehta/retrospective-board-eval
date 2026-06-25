import { useState } from 'react'

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 480,
    maxWidth: '90vw',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardContent: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    color: '#999',
    cursor: 'pointer',
    marginLeft: 12,
  },
  commentList: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: 16,
  },
  comment: {
    padding: '8px 0',
    borderBottom: '1px solid #eee',
  },
  commentContent: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  commentMeta: {
    fontSize: 12,
    color: '#999',
  },
  noComments: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
    fontSize: 14,
  },
  form: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
  },
  submitBtn: {
    padding: '8px 16px',
    background: '#646cff',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
  },
}

export default function CommentsModal({ card, onClose, onAddComment }) {
  const [content, setContent] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    onAddComment(card.id, content.trim())
    setContent('')
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.cardContent}>{card.content}</div>
          <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div style={styles.commentList}>
          {(!card.comments || card.comments.length === 0) ? (
            <p style={styles.noComments}>No comments yet</p>
          ) : (
            card.comments.map(comment => (
              <div key={comment.id} style={styles.comment}>
                <div style={styles.commentContent}>{comment.content}</div>
                <div style={styles.commentMeta}>
                  {comment.author_name} &middot; {new Date(comment.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <input
            style={styles.input}
            type="text"
            placeholder="Write a comment..."
            value={content}
            onChange={e => setContent(e.target.value)}
            autoFocus
          />
          <button type="submit" style={styles.submitBtn}>Send</button>
        </form>
      </div>
    </div>
  )
}
