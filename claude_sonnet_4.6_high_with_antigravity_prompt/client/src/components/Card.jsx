import { Draggable } from '@hello-pangea/dnd';

export default function Card({ card, index, onClick }) {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card${snapshot.isDragging ? ' is-dragging' : ''}`}
          onClick={onClick}
          id={`card-${card.id}`}
          style={provided.draggableProps.style}
        >
          <div className="card-content">{card.content}</div>
          <div className="card-meta">
            <span className="card-author">by {card.author_name}</span>
            {card.comments && card.comments.length > 0 && (
              <span className="card-comment-count">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {card.comments.length}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
