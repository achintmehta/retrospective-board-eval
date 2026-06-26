import { useMemo } from 'react';

function avatarColor(name) {
  const hue = [...(name || 'Guest')].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  return `hsl(${hue} 75% 60%)`;
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Card({ provided, snapshot, card, commentCount, onOpen }) {
  const color = useMemo(() => avatarColor(card.author_name), [card.author_name]);
  const initial = useMemo(() => initials(card.author_name), [card.author_name]);

  return (
    <article
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={`card${snapshot.isDragging ? ' is-dragging' : ''}`}
      id={`card-${card.id}`}
      onClick={(e) => {
        // Avoid opening on a drag-release click
        if (snapshot.isDragging) return;
        onOpen?.();
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Card by ${card.author_name}: ${card.content.slice(0, 80)}`}
    >
      <p className="card-content">{card.content}</p>
      <footer className="card-footer">
        <span className="card-author">
          <span className="avatar" style={{ background: color }} aria-hidden="true">
            {initial}
          </span>
          <span className="avatar-name">{card.author_name}</span>
        </span>
        {commentCount > 0 && (
          <span className="card-comment-count" title={`${commentCount} comment(s)`}>
            <span aria-hidden="true">💬</span> {commentCount}
          </span>
        )}
      </footer>
    </article>
  );
}
