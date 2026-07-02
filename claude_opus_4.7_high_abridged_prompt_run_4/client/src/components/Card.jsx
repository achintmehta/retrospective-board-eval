import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export default function Card({ card, onOpenComments }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: 'card', columnId: card.column_id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const commentCount = card.comments?.length ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? 'is-dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="card-content">{card.content}</div>
      <div className="card-foot">
        <div className="card-author">
          <span className="avatar-chip" aria-hidden>
            {initials(card.author_name)}
          </span>
          <span className="author-name">{card.author_name}</span>
        </div>
        <button
          type="button"
          className="card-comments"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments(card);
          }}
        >
          <span aria-hidden>💬</span> {commentCount}
        </button>
      </div>
    </div>
  );
}
