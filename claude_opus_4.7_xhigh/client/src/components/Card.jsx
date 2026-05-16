import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import CommentList from './CommentList.jsx';
import CommentForm from './CommentForm.jsx';

export default function Card({ card, index }) {
  const [expanded, setExpanded] = useState(false);
  const commentCount = card.comments?.length || 0;

  return (
    <Draggable draggableId={`card-${card.id}`} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card ${snapshot.isDragging ? 'card--dragging' : ''}`}
        >
          <p className="card-content">{card.content}</p>
          <div className="card-meta">
            <span className="muted small">— {card.author_name}</span>
            <button
              type="button"
              className="link-button"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Hide' : `Comments (${commentCount})`}
            </button>
          </div>
          {expanded && (
            <div className="card-comments">
              <CommentList comments={card.comments || []} />
              <CommentForm cardId={card.id} />
            </div>
          )}
        </article>
      )}
    </Draggable>
  );
}
