export default function CardItem({ card, provided, isDragging, onOpenComments }) {
  const commentCount = card.comments ? card.comments.length : 0

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={`card${isDragging ? ' dragging' : ''}`}
    >
      <p className="card-content">{card.content}</p>
      <div className="card-meta">
        <span className="card-author">{card.author_name}</span>
        <button
          className="comment-btn"
          onClick={() => onOpenComments(card)}
        >
          {commentCount > 0 ? `${commentCount} comment${commentCount !== 1 ? 's' : ''}` : 'Comment'}
        </button>
      </div>
    </div>
  )
}
