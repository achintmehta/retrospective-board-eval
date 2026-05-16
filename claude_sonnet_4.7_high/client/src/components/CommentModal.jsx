import { useState } from 'react'

export default function CommentModal({ card, authorName, onAddComment, onClose }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim() || submitting) return
    setSubmitting(true)
    onAddComment(card.id, text.trim())
    setText('')
    setSubmitting(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal comment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Comments</h2>
          <button className="close-btn" onClick={onClose}>x</button>
        </div>
        <div className="card-content-preview">
          <strong>Card:</strong> {card.content}
          <span className="author-tag"> by {card.author_name}</span>
        </div>
        <div className="comments-list">
          {(!card.comments || card.comments.length === 0) ? (
            <p className="empty-state">No comments yet.</p>
          ) : (
            card.comments.map((c) => (
              <div key={c.id} className="comment-item">
                <span className="comment-author">{c.author_name}:</span>
                <span className="comment-text"> {c.content}</span>
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleSubmit} className="comment-form">
          <input
            type="text"
            placeholder="Add a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={!text.trim() || submitting}>
            Post
          </button>
        </form>
      </div>
    </div>
  )
}
