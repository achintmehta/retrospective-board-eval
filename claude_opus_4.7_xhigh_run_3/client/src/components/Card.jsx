import { Draggable } from '@hello-pangea/dnd';

function formatTime(ms) {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Card({ card, index, onOpenComments }) {
  const commentCount = card.comments?.length ?? 0;
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card${snapshot.isDragging ? ' dragging' : ''}`}
        >
          <div className="content">{card.content}</div>
          <div className="meta">
            <span>
              {card.authorName} · {formatTime(card.createdAt)}
            </span>
            <button type="button" onClick={() => onOpenComments(card)}>
              💬 {commentCount}
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}
