import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { colorForName, initialsFor } from '../lib/identity.js';
import { timeAgo } from '../lib/format.js';
import './CardView.css';

export default function CardView({ card, onOpenComments, isOverlay }) {
  const draggable = useDraggable({
    id: card.id,
    data: { type: 'card', columnId: card.column_id },
    disabled: isOverlay,
  });

  const { attributes, listeners, setNodeRef, transform, isDragging } = draggable;

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const authorColor = colorForName(card.author_name);
  const commentCount = (card.comments || []).length;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? 'is-dragging' : ''} ${isOverlay ? 'is-overlay' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="card-content">{card.content}</div>
      <footer className="card-footer">
        <div className="card-author">
          <span
            className="card-avatar"
            style={{ background: `linear-gradient(135deg, ${authorColor}, ${authorColor}aa)` }}
            title={card.author_name}
          >
            {initialsFor(card.author_name)}
          </span>
          <span className="card-author-name">{card.author_name}</span>
          <span className="card-time">· {timeAgo(card.created_at)}</span>
        </div>
        {onOpenComments && !isOverlay && (
          <button
            className="card-comments-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title={commentCount ? `${commentCount} comments` : 'Add comment'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {commentCount > 0 && <span className="card-comments-count">{commentCount}</span>}
          </button>
        )}
      </footer>
    </article>
  );
}
