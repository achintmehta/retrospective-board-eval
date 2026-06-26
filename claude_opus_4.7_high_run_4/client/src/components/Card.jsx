import { Draggable } from '@hello-pangea/dnd';

export default function Card({ card, index, onOpen }) {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card${snapshot.isDragging ? ' dragging' : ''}`}
          onClick={() => onOpen(card)}
        >
          <div className="content">{card.content}</div>
          <div className="meta">
            <span>{card.author_name}</span>
            <span>
              {card.comments.length > 0
                ? `${card.comments.length} 💬`
                : ''}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}
