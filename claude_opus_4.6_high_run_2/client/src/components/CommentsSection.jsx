import { useState } from 'react'
import './CommentsSection.css'

function CommentsSection({ comments, onAddComment }) {
  const [content, setContent] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (content.trim()) {
      onAddComment(content.trim())
      setContent('')
    }
  }

  return (
    <div className="comments-section">
      <div className="comments-list">
        {comments.map(comment => (
          <div key={comment.id} className="comment">
            <span className="comment-author">{comment.author_name}</span>
            <p className="comment-content">{comment.content}</p>
          </div>
        ))}
      </div>
      <form className="comment-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button type="submit">Post</button>
      </form>
    </div>
  )
}

export default CommentsSection
