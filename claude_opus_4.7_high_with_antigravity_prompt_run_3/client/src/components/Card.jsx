import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function initials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function relTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function Card({ card, onAddComment }) {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const commentCount = card.comments?.length || 0;

  function handleComment(e) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    onAddComment(card.id, text);
    setCommentText('');
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? 'is-dragging' : ''}`}
      id={`card-${card.id}`}
      {...attributes}
      {...listeners}
    >
      <div className="card__content">{card.content}</div>
      <div className="card__footer">
        <span className="card__author">
          <span className="card__avatar" aria-hidden="true">{initials(card.authorName)}</span>
          <span>{card.authorName}</span>
          <span style={{ color: 'var(--c-text-mute)' }}>· {relTime(card.createdAt)}</span>
        </span>
        <button
          type="button"
          className={`card__comments-toggle ${commentCount ? 'has-comments' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          id={`toggle-comments-${card.id}`}
        >
          <CommentIcon />
          {commentCount}
        </button>
      </div>

      {expanded && (
        <div
          className="card__comments"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {card.comments?.map((cm) => (
            <div className="comment" key={cm.id}>
              <div className="comment__head">
                <span className="comment__author">{cm.authorName}</span>
                <span>· {relTime(cm.createdAt)}</span>
              </div>
              <div>{cm.content}</div>
            </div>
          ))}
          <form className="comment-form" onSubmit={handleComment}>
            <input
              className="input"
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={1000}
              id={`comment-input-${card.id}`}
            />
            <button
              type="submit"
              className="btn btn--primary btn--sm"
              disabled={!commentText.trim()}
              id={`add-comment-${card.id}`}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5a8.5 8.5 0 0 1 17 0z" />
    </svg>
  );
}

export function CardOverlay({ card }) {
  return (
    <div className="card is-overlay" id={`card-overlay-${card.id}`}>
      <div className="card__content">{card.content}</div>
      <div className="card__footer">
        <span className="card__author">
          <span className="card__avatar" aria-hidden="true">{initials(card.authorName)}</span>
          <span>{card.authorName}</span>
        </span>
      </div>
    </div>
  );
}
