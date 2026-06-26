import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { colorForName, initials } from '../lib/session.js';
import { formatRelative } from '../lib/format.js';

export default function Card({ card, onOpen }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', columnId: card.column_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const accent = colorForName(card.author_name);

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`card ${isDragging ? 'card-dragging' : ''}`}
      onClick={() => onOpen?.(card)}
    >
      <div className="card-accent" style={{ background: accent }} />
      <p className="card-content">{card.content}</p>
      <footer className="card-footer">
        <div className="card-author">
          <span
            className="avatar"
            style={{ background: accent }}
            title={card.author_name}
          >
            {initials(card.author_name)}
          </span>
          <span className="card-author-name">{card.author_name}</span>
        </div>
        <div className="card-meta">
          {card.comments?.length > 0 && (
            <span className="card-comments-count" title={`${card.comments.length} comment${card.comments.length === 1 ? '' : 's'}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {card.comments.length}
            </span>
          )}
          <span className="card-time">{formatRelative(card.created_at)}</span>
        </div>
      </footer>
    </article>
  );
}
