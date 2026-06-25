import { useState } from 'react'

export default function CardDetailModal({ card, onClose, onAddComment }) {
  const [comment, setComment] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    onAddComment(card.id, comment.trim())
    setComment('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card-detail" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>X</button>
        <h2>{card.content}</h2>
        <p className="card-detail-author">by {card.author_name}</p>

        <div className="comments-section">
          <h3>Comments</h3>
          {card.comments.length === 0 && <p className="empty">No comments yet.</p>}
          {card.comments.map(c => (
            <div key={c.id} className="comment">
              <p>{c.content}</p>
              <span className="comment-meta">{c.author_name} - {new Date(c.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="comment-form">
          <input
            type="text"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add a comment..."
          />
          <button type="submit">Comment</button>
        </form>
      </div>
    </div>
  )
}
