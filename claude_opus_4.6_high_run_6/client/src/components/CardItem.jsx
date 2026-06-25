import { useState } from 'react'
import CommentSection from './CommentSection'

function CardItem({ card, provided, onAddComment }) {
  const [showComments, setShowComments] = useState(false)

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={{
        background: '#fff',
        borderRadius: 6,
        padding: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        ...provided.draggableProps.style
      }}
    >
      <p style={{ fontSize: 14, marginBottom: 6, whiteSpace: 'pre-wrap' }}>{card.content}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#999' }}>{card.author_name}</span>
        <button
          onClick={() => setShowComments(!showComments)}
          style={{
            background: 'none', padding: '2px 6px', fontSize: 12, color: '#4a90d9'
          }}
        >
          {card.comments?.length || 0} comments
        </button>
      </div>
      {showComments && (
        <CommentSection
          comments={card.comments || []}
          onAdd={(content) => onAddComment(card.id, content)}
        />
      )}
    </div>
  )
}

export default CardItem
