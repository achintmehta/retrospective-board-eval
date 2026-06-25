import { useState } from 'react'

function CommentSection({ comments, onAdd }) {
  const [content, setContent] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (content.trim()) {
      onAdd(content.trim())
      setContent('')
    }
  }

  return (
    <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 8 }}>
      {comments.map(comment => (
        <div key={comment.id} style={{ fontSize: 12, marginBottom: 6, color: '#555' }}>
          <strong>{comment.author_name}:</strong> {comment.content}
        </div>
      ))}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a comment..."
          style={{ fontSize: 12, padding: '4px 8px' }}
        />
        <button
          type="submit"
          style={{ background: '#4a90d9', color: '#fff', fontSize: 12, padding: '4px 10px' }}
        >
          Post
        </button>
      </form>
    </div>
  )
}

export default CommentSection
