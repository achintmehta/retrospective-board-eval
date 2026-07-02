import { useState, useEffect, useRef } from 'react'

export default function CommentPanel({ card, board, onClose, onAddComment }) {
  const [text, setText] = useState('')
  const listRef = useRef(null)

  const liveCard = board?.columns
    ?.flatMap(c => c.cards)
    ?.find(c => c.id === card.id) || card

  const comments = liveCard.comments || []

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [comments.length])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onAddComment(card.id, text.trim())
    setText('')
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Comments</h3>
          <button onClick={onClose} style={styles.closeBtn}>&#10005;</button>
        </div>

        <div style={styles.cardPreview}>
          <p style={styles.cardContent}>{card.content}</p>
          <span style={styles.cardAuthor}>by {card.author_name}</span>
        </div>

        <div ref={listRef} style={styles.commentList}>
          {comments.length === 0 ? (
            <p style={styles.emptyText}>No comments yet. Be the first!</p>
          ) : (
            comments.map(cmt => (
              <div key={cmt.id} style={styles.comment}>
                <div style={styles.commentHeader}>
                  <span style={styles.commentAuthor}>{cmt.author_name}</span>
                  <span style={styles.commentDate}>
                    {new Date(cmt.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={styles.commentContent}>{cmt.content}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write a comment..."
            autoFocus
            style={styles.input}
          />
          <button type="submit" style={styles.sendBtn}>
            &#10148;
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10,12,18,0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  panel: {
    width: '400px',
    maxWidth: '90vw',
    background: 'linear-gradient(180deg, #1a1d27 0%, #181b24 100%)',
    borderLeft: '1px solid #2e3346',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #2e3346',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e8eaf0',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    color: '#6b7089',
    fontSize: '16px',
    padding: '4px 8px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'color 200ms',
  },
  cardPreview: {
    padding: '16px 24px',
    borderBottom: '1px solid #2e3346',
    background: 'rgba(108,99,255,0.04)',
  },
  cardContent: {
    fontSize: '14px',
    color: '#e8eaf0',
    margin: 0,
    lineHeight: 1.5,
  },
  cardAuthor: {
    fontSize: '12px',
    color: '#6b7089',
    marginTop: '6px',
    display: 'block',
  },
  commentList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyText: {
    color: '#6b7089',
    fontSize: '13px',
    textAlign: 'center',
    padding: '32px 0',
  },
  comment: {
    background: '#222632',
    borderRadius: '10px',
    padding: '12px 16px',
    border: '1px solid #2e3346',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  commentAuthor: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6c63ff',
  },
  commentDate: {
    fontSize: '11px',
    color: '#6b7089',
  },
  commentContent: {
    fontSize: '13px',
    color: '#e8eaf0',
    margin: 0,
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    gap: '8px',
    padding: '16px 24px',
    borderTop: '1px solid #2e3346',
    background: '#0f1117',
  },
  input: {
    flex: 1,
    background: '#181b24',
    border: '1px solid #2e3346',
    borderRadius: '8px',
    color: '#e8eaf0',
    padding: '10px 14px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #6c63ff 0%, #5a52e0 100%)',
    color: '#fff',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
}
