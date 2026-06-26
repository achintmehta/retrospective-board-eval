export default function Card({ card, onOpenComments, onDragStart, onDragEnd, dragging }) {
  return (
    <div
      className={`card${dragging ? ' dragging' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onDragEnd={onDragEnd}
      onClick={() => onOpenComments(card)}
    >
      <p className="card-content">{card.content}</p>
      <div className="card-footer">
        <span className="card-author">{card.author_name}</span>
        <span className="card-comments">
          💬 {card.comments?.length || 0}
        </span>
      </div>
    </div>
  );
}
