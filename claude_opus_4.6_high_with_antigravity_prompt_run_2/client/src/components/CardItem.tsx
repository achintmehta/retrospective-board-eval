import { useDraggable } from '@dnd-kit/core';
import type { Card } from '../pages/BoardPage';

interface CardItemProps {
  card: Card;
  onOpenComments: (card: Card) => void;
}

export default function CardItem({ card, onOpenComments }: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
      }
    : undefined;

  return (
    <div
      className={`card${isDragging ? ' dragging' : ''}`}
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      id={`card-${card.id}`}
    >
      <div className="card-content">{card.content}</div>
      <div className="card-meta">
        <span className="card-author">{card.author_name}</span>
        <button
          className="card-comments-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments(card);
          }}
          id={`comments-btn-${card.id}`}
        >
          {card.comments.length > 0 ? `${card.comments.length} comments` : 'Comment'}
        </button>
      </div>
    </div>
  );
}
