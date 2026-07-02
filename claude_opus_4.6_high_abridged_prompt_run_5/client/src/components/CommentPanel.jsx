import { useState, useRef, useEffect } from 'react'
import './CommentPanel.css'

function CommentPanel({ card, onClose, onAddComment }) {
  const [text, setText] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [card.comments])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onAddComment(card.id, text.trim())
    setText('')
  }

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <div className="comment-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>Comments</h3>
          <button className="panel-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="panel-card-preview">
          <p>{card.content}</p>
          <span className="preview-author">{card.author_name}</span>
        </div>

        <div className="comments-list" ref={listRef}>
          {(!card.comments || card.comments.length === 0) ? (
            <div className="no-comments">No comments yet</div>
          ) : (
            card.comments.map((c) => (
              <div key={c.id} className="comment">
                <div className="comment-header">
                  <span className="comment-author">{c.author_name}</span>
                  <span className="comment-time">
                    {new Date(c.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="comment-text">{c.content}</p>
              </div>
            ))
          )}
        </div>

        <form className="comment-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
            className="comment-input"
            autoFocus
          />
          <button type="submit" className="btn-primary btn-sm" disabled={!text.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default CommentPanel
