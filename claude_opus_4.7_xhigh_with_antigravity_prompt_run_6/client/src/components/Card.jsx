import { createPortal } from 'react-dom';
import { Draggable } from '@hello-pangea/dnd';
import Avatar from './Avatar.jsx';
import { formatRelative } from '../lib/time.js';

// Lazy-create a single portal host so dragging cards escape all overflow:hidden /
// overflow:auto parents (column, cards-scroll, horizontal board-columns scroller).
let dragPortalEl = null;
function getDragPortal() {
  if (typeof document === 'undefined') return null;
  if (dragPortalEl && document.body.contains(dragPortalEl)) return dragPortalEl;
  dragPortalEl = document.createElement('div');
  dragPortalEl.className = 'drag-portal';
  document.body.appendChild(dragPortalEl);
  return dragPortalEl;
}

export default function Card({ card, index, isFlashing, onOpenComments }) {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => {
        const child = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`card ${snapshot.isDragging ? 'is-dragging' : ''} ${isFlashing ? 'card-flash' : ''}`}
            id={`card-${card.id}`}
            aria-label={`Card by ${card.authorName}`}
          >
            <div className="card-content">{card.content}</div>
            <div className="card-foot">
              <span className="author">
                <Avatar name={card.authorName} />
                <span>{card.authorName}</span>
              </span>
              <button
                type="button"
                className="comments-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenComments(card);
                }}
                id={`comments-btn-${card.id}`}
                title="View comments"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <strong>{card.comments?.length || 0}</strong>
              </button>
            </div>
            <div className="sr-only">Created {formatRelative(card.createdAt)}</div>
          </div>
        );

        if (snapshot.isDragging) {
          const portal = getDragPortal();
          if (portal) return createPortal(child, portal);
        }
        return child;
      }}
    </Draggable>
  );
}
