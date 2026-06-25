import { useState } from 'react'
import './CardItem.css'

export default function CardItem({ card, onAddComment }) {
  const [expanded, setExpanded] = useState(false)
  const [comment, setComment] = useState('')

  function handleSubmitComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    onAddComment(card.id, comment.trim())
    setComment('')
  }

  return (
    <div className="card-item">
      <div className="card-content" onClick={() => setExpanded(!expanded)}>
        <p>{card.content}</p>
        <span className="card-author">{card.author_name}</span>
      </div>

      {card.comments.length > 0 && (
        <button
          className="comments-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {card.comments.length} comment{card.comments.length !== 1 ? 's' : ''}
        </button>
      )}

      {expanded && (
        <div className="comments-section">
          {card.comments.map(c => (
            <div key={c.id} className="comment">
              <span className="comment-author">{c.author_name}</span>
              <span className="comment-text">{c.content}</span>
            </div>
          ))}
          <form className="comment-form" onSubmit={handleSubmitComment}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
            <button type="submit">Post</button>
          </form>
        </div>
      )}
    </div>
  )
}
