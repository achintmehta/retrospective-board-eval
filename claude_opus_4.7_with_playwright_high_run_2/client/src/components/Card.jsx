import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';

export default function Card({ card, index, onAddComment }) {
  const [open, setOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  function submitComment(e) {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(card.id, trimmed);
    setCommentText('');
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card-item ${snapshot.isDragging ? 'dragging' : ''}`}
        >
          <div className="card-content">{card.content}</div>
          <div className="card-meta">
            <span className="muted small">— {card.author_name}</span>
            <button
              type="button"
              className="link-like small"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              {open ? 'Hide' : 'Show'} comments ({card.comments?.length || 0})
            </button>
          </div>

          {open && (
            <div className="comments">
              {(card.comments || []).map((c) => (
                <div key={c.id} className="comment">
                  <div className="comment-text">{c.content}</div>
                  <div className="muted small">— {c.author_name}</div>
                </div>
              ))}
              <form onSubmit={submitComment} className="row-form small-form">
                <input
                  type="text"
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  aria-label="Comment"
                />
                <button type="submit" disabled={!commentText.trim()}>
                  Add
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
