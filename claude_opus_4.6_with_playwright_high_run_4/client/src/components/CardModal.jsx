import { useState } from 'react'

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: 'white', borderRadius: 12, padding: 24, width: 480, maxHeight: '80vh',
    overflowY: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  content: { fontSize: 16, lineHeight: 1.5 },
  author: { fontSize: 12, color: '#888', marginTop: 4 },
  closeBtn: { background: 'transparent', color: '#888', fontSize: 20, padding: '4px 8px' },
  commentsSection: { marginTop: 24, borderTop: '1px solid #eee', paddingTop: 16 },
  commentsTitle: { fontSize: 14, fontWeight: 600, marginBottom: 12 },
  comment: { padding: '8px 0', borderBottom: '1px solid #f0f0f0' },
  commentContent: { fontSize: 14 },
  commentMeta: { fontSize: 11, color: '#888', marginTop: 4 },
  form: { display: 'flex', gap: 8, marginTop: 12 },
  input: { flex: 1 },
}

export default function CardModal({ card, onClose, onAddComment }) {
  const [comment, setComment] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    onAddComment(card.id, comment.trim())
    setComment('')
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.content}>{card.content}</div>
            <div style={styles.author}>by {card.author_name}</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div style={styles.commentsSection}>
          <div style={styles.commentsTitle}>
            Comments ({(card.comments || []).length})
          </div>
          {(card.comments || []).map((c) => (
            <div key={c.id} style={styles.comment}>
              <div style={styles.commentContent}>{c.content}</div>
              <div style={styles.commentMeta}>{c.author_name} &middot; {new Date(c.created_at).toLocaleString()}</div>
            </div>
          ))}
          {(!card.comments || card.comments.length === 0) && (
            <div style={{ color: '#888', fontSize: 13, padding: '8px 0' }}>No comments yet</div>
          )}
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              style={styles.input}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
            />
            <button type="submit">Comment</button>
          </form>
        </div>
      </div>
    </div>
  )
}
