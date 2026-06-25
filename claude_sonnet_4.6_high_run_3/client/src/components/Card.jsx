import { useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'

export default function Card({ card, index, authorName, socket, boardId }) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState(card.comments || [])
  const [commentText, setCommentText] = useState('')

  // Keep comments in sync when parent updates
  if (card.comments && card.comments !== comments && !showComments) {
    setComments(card.comments)
  }

  function handleAddComment(e) {
    e.preventDefault()
    const text = commentText.trim()
    if (!text) return
    socket.emit('add_comment', {
      boardId,
      cardId: card.id,
      content: text,
      authorName,
    }, ({ comment }) => {
      setComments((prev) => [...prev, comment])
    })
    setCommentText('')
  }

  // Listen for new comments on this card
  socket.off(`comment_added_${card.id}`)

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            background: snapshot.isDragging ? '#eef2ff' : 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
            marginBottom: 8,
            boxShadow: snapshot.isDragging ? '0 8px 24px rgba(0,0,0,0.18)' : 'var(--shadow)',
            cursor: 'grab',
            ...provided.draggableProps.style,
          }}
        >
          <p style={{ marginBottom: 6 }}>{card.content}</p>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            {card.author_name}
          </div>
          <button
            onClick={() => setShowComments((v) => !v)}
            style={{
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text-muted)', padding: '4px 10px', fontSize: 12,
            }}
          >
            {showComments ? 'Hide' : `Comments (${comments.length})`}
          </button>

          {showComments && (
            <div style={{ marginTop: 10 }}>
              {comments.map((c) => (
                <div key={c.id} style={{
                  background: '#f8f9fb', borderRadius: 6, padding: '8px 10px',
                  marginBottom: 6, fontSize: 13,
                }}>
                  <div>{c.content}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    — {c.author_name}
                  </div>
                </div>
              ))}
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input
                  type="text"
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  style={{ background: 'var(--primary)', color: '#fff', padding: '6px 12px', fontSize: 13 }}
                >
                  Add
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}
