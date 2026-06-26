import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { timeAgo } from '../lib/format.js';
import { initials } from '../lib/session.js';

export default function Card({ card, onAddComment }) {
  const [open, setOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: 'card', card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function submitComment(e) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    onAddComment(card.id, text);
    setCommentText('');
  }

  const comments = card.comments || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-item ${isDragging ? 'is-dragging' : ''}`}
      id={`card-${card.id}`}
      {...attributes}
      {...listeners}
    >
      <div className="card-content">{card.content}</div>
      <div className="card-foot">
        <span className="card-author">
          <span className="mini-avatar" aria-hidden="true">{initials(card.author_name)}</span>
          <span>{card.author_name} · {timeAgo(card.created_at)}</span>
        </span>
        <button
          type="button"
          className={`comment-toggle ${open ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          onPointerDown={(e) => e.stopPropagation()}
          id={`comment-toggle-${card.id}`}
        >
          💬 {comments.length}
        </button>
      </div>

      {open && (
        <div
          className="comments-panel"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {comments.length === 0 && (
            <div className="comment-item" style={{ fontStyle: 'italic', opacity: 0.7 }}>
              No comments yet.
            </div>
          )}
          {comments.map((c) => (
            <div className="comment-item" key={c.id} id={`comment-${c.id}`}>
              <div>{c.content}</div>
              <div className="comment-meta">
                <b>{c.author_name}</b>· {timeAgo(c.created_at)}
              </div>
            </div>
          ))}
          <form className="comment-form" onSubmit={submitComment}>
            <textarea
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={400}
              id={`comment-input-${card.id}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment(e);
              }}
            />
            <div className="row">
              <button
                type="submit"
                className="btn btn-sm btn-primary"
                disabled={!commentText.trim()}
                id={`comment-submit-${card.id}`}
              >
                Post
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
