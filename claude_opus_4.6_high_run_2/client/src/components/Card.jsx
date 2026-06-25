import { useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import CommentsSection from './CommentsSection'
import './Card.css'

function Card({ card, index, onAddComment }) {
  const [showComments, setShowComments] = useState(false)

  return (
    <Draggable draggableId={String(card.id)} index={index}>
      {(provided, snapshot) => (
        <div
          className={`card ${snapshot.isDragging ? 'card-dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <p className="card-content">{card.content}</p>
          <div className="card-meta">
            <span className="card-author">{card.author_name}</span>
            <button
              className="card-comments-toggle"
              onClick={() => setShowComments(!showComments)}
            >
              {card.comments?.length || 0} comment{card.comments?.length !== 1 ? 's' : ''}
            </button>
          </div>
          {showComments && (
            <CommentsSection
              comments={card.comments || []}
              onAddComment={(content) => onAddComment(card.id, content)}
            />
          )}
        </div>
      )}
    </Draggable>
  )
}

export default Card
