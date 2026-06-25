import { useState } from 'react'

export default function CardItem({ card, onAddComment }) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')

  const handleSubmitComment = (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    onAddComment(card.id, commentText.trim())
    setCommentText('')
  }

  return (
    <div className="card">
      <div className="card-content">{card.content}</div>
      <div className="card-meta">
        by {card.author_name}
      </div>
      <button
        className="card-comments-toggle"
        onClick={() => setShowComments(!showComments)}
      >
        {showComments ? 'Hide' : 'Show'} Comments ({(card.comments || []).length})
      </button>
      {showComments && (
        <div className="card-comments">
          {(card.comments || []).map(comment => (
            <div key={comment.id} className="comment">
              <span className="comment-author">{comment.author_name}: </span>
              {comment.content}
            </div>
          ))}
          <form className="comment-form" onSubmit={handleSubmitComment}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  )
}
