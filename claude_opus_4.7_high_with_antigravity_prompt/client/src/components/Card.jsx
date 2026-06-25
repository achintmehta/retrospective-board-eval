import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { initialsOf } from '../lib/guestSession.js';

function formatTime(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function Card({ card, comments, onAddComment }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card }
  });
  const [open, setOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined
  };

  function handleSubmitComment(e) {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(card.id, trimmed);
    setCommentText('');
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? 'card--dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="card-content">{card.content}</div>
      <div className="card-footer">
        <span className="card-author">
          <span className="card-author-avatar">{initialsOf(card.author_name)}</span>
          {card.author_name}
        </span>
        <button
          type="button"
          className="card-comments-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        >
          💬 {comments.length}
        </button>
      </div>
      {open && (
        <div
          className="comments-drawer"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {comments.length === 0 && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>
              No comments yet — kick things off.
            </div>
          )}
          {comments.map((cm) => (
            <div className="comment" key={cm.id}>
              {cm.content}
              <div className="comment-meta">
                <span>{cm.author_name}</span>
                <span>{formatTime(cm.created_at)}</span>
              </div>
            </div>
          ))}
          <form className="comment-form" onSubmit={handleSubmitComment}>
            <input
              className="input"
              type="text"
              placeholder="Reply…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={500}
            />
            <button type="submit" className="btn btn-primary" disabled={!commentText.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

export function CardOverlay({ card }) {
  return (
    <article className="card card--overlay">
      <div className="card-content">{card.content}</div>
      <div className="card-footer">
        <span className="card-author">
          <span className="card-author-avatar">{initialsOf(card.author_name)}</span>
          {card.author_name}
        </span>
      </div>
    </article>
  );
}
