import { useState } from 'react'

export default function CommentPanel({ card, authorName, onAddComment, onClose }) {
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onAddComment(card.id, text.trim())
    setText('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal comment-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Comments</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="card-preview">
          <strong>{card.content}</strong>
          <span className="card-author">by {card.author_name}</span>
        </div>
        <div className="comments-list">
          {card.comments && card.comments.length > 0 ? (
            card.comments.map((c) => (
              <div key={c.id} className="comment">
                <span className="comment-author">{c.author_name}:</span>
                <span className="comment-content">{c.content}</span>
              </div>
            ))
          ) : (
            <p className="empty">No comments yet.</p>
          )}
        </div>
        <form className="comment-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Add a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={!text.trim()}>Post</button>
        </form>
      </div>
    </div>
  )
}
