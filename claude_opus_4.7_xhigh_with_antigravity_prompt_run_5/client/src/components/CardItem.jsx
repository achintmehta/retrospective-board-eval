import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { initials } from '../lib/identity';

function formatRelative(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function CardItem({ card, commentCount = 0, onOpen, dragOverlay = false }) {
  const sortable = useSortable({
    id: card.id,
    data: { type: 'card', columnId: card.column_id },
    disabled: dragOverlay,
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = dragOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const className =
    'card-item' +
    (isDragging ? ' dragging' : '') +
    (dragOverlay ? ' dragging-overlay' : '');

  return (
    <article
      ref={dragOverlay ? undefined : setNodeRef}
      style={style}
      className={className}
      id={`card-${card.id}`}
      {...(dragOverlay ? {} : attributes)}
      {...(dragOverlay ? {} : listeners)}
      onClick={(e) => {
        if (dragOverlay) return;
        if (e.defaultPrevented) return;
        onOpen?.(card);
      }}
      onKeyDown={(e) => {
        if (dragOverlay) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.(card);
        }
      }}
      tabIndex={dragOverlay ? -1 : 0}
      aria-label={`Card by ${card.author_name}: ${card.content}`}
    >
      <div className="card-content">{card.content}</div>
      <div className="card-footer">
        <span className="card-author">
          <span className="avatar" aria-hidden>{initials(card.author_name)}</span>
          <span>{card.author_name}</span>
        </span>
        <span className="row" style={{ gap: 8 }}>
          {commentCount > 0 && (
            <span className="comment-pill" title="Comments">
              💬 {commentCount}
            </span>
          )}
          <span>{formatRelative(card.created_at)}</span>
        </span>
      </div>
    </article>
  );
}
