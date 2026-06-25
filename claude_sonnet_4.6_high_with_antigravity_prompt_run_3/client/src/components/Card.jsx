import { Draggable } from '@hello-pangea/dnd';

function getInitials(name) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Card({ card, index, onOpenComments }) {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`retro-card${snapshot.isDragging ? ' is-dragging' : ''}`}
          id={`card-${card.id}`}
        >
          <div className="retro-card-content">{card.content}</div>
          <div className="retro-card-footer">
            <div className="retro-card-author">
              <div className="mini-avatar">{getInitials(card.author_name)}</div>
              {card.author_name}
            </div>
            <button
              className="retro-card-comment-btn"
              onClick={() => onOpenComments(card)}
              aria-label={`Comments on card by ${card.author_name}`}
              id={`card-comments-btn-${card.id}`}
            >
              💬 {card.comments?.length ?? 0}
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}
