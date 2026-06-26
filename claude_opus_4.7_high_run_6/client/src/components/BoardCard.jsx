import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import CardComments from './CardComments.jsx';

export default function BoardCard({ card, index, comments, onAddComment }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`board-card${snapshot.isDragging ? ' dragging' : ''}`}
        >
          <div className="card-content">{card.content}</div>
          <div className="card-footer">
            <span className="card-author">{card.author_name}</span>
            <button
              type="button"
              className="link-button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded
                ? 'Hide comments'
                : comments.length > 0
                ? `Comments (${comments.length})`
                : 'Add comment'}
            </button>
          </div>
          {expanded && (
            <CardComments
              comments={comments}
              onAddComment={(content) => onAddComment(card.id, content)}
            />
          )}
        </div>
      )}
    </Draggable>
  );
}
