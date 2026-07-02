import { createPortal } from 'react-dom';
import { Draggable } from '@hello-pangea/dnd';

function initials(name) {
  return (name || 'G')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('');
}

// Ancestors with `transform` (framer-motion animate) or `backdrop-filter` (.column)
// become the containing block for `position: fixed`, which offsets the drag
// preview. Portalling the dragged card to <body> escapes those ancestors.
function getDragPortal() {
  let el = document.getElementById('retro-drag-portal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'retro-drag-portal';
    document.body.appendChild(el);
  }
  return el;
}

export default function Card({ card, index, onOpen }) {
  const commentCount = card.comments?.length || 0;

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => {
        const element = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`card ${snapshot.isDragging ? 'card--dragging' : ''}`}
            onClick={() => onOpen(card.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onOpen(card.id);
            }}
          >
            <div className="card__content">{card.content}</div>
            <div className="card__foot">
              <div className="card__author" title={card.author_name}>
                <span className="avatar">{initials(card.author_name)}</span>
                <span className="card__author-name">{card.author_name}</span>
              </div>
              <div className={`card__comments ${commentCount > 0 ? 'card__comments--has' : ''}`}>
                💬 {commentCount}
              </div>
            </div>
          </div>
        );

        if (snapshot.isDragging) {
          return createPortal(element, getDragPortal());
        }
        return element;
      }}
    </Draggable>
  );
}
