import { Draggable } from '@hello-pangea/dnd'

const COLUMN_COLORS = [
  'linear-gradient(135deg, #6c63ff, #9f7aea)',
  'linear-gradient(135deg, #38b2ac, #4fd1c5)',
  'linear-gradient(135deg, #f06292, #f8a5c2)',
  'linear-gradient(135deg, #fbbf24, #fcd34d)',
]

function initials(name) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export default function Card({ card, index, onOpenComments }) {
  const commentCount = card.comments?.length ?? 0

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          id={`card-${card.id}`}
          className={`card${snapshot.isDragging ? ' dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <div className="card-content">{card.content}</div>
          <div className="card-meta">
            <div className="card-author">
              <div className="card-author-avatar">{initials(card.author_name)}</div>
              {card.author_name}
            </div>
            <button
              id={`card-comments-btn-${card.id}`}
              className="card-comment-badge"
              onClick={() => onOpenComments(card)}
              aria-label={`${commentCount} comment${commentCount !== 1 ? 's' : ''}`}
            >
              💬 {commentCount}
            </button>
          </div>
        </div>
      )}
    </Draggable>
  )
}
