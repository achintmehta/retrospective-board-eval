import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

type Props = {
  card: Card;
  accent: string;
  onOpen: (card: Card) => void;
};

export function CardView({ card, accent, onOpen }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: 'card', card } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-accent={accent}
      className={`card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <p className="card-content">{card.content}</p>
      <div className="card-footer">
        <span className="card-author">
          <span className="who-avatar">{initials(card.author_name) || '?'}</span>
          {card.author_name}
        </span>
        <button
          type="button"
          className="card-actions-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(card);
          }}
        >
          <svg className="icon" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {card.comments.length}
        </button>
      </div>
    </div>
  );
}

export function CardOverlay({ card, accent }: { card: Card; accent: string }) {
  return (
    <div className="card dragging-overlay" data-accent={accent}>
      <p className="card-content">{card.content}</p>
      <div className="card-footer">
        <span className="card-author">
          <span className="who-avatar">{initials(card.author_name) || '?'}</span>
          {card.author_name}
        </span>
      </div>
    </div>
  );
}
