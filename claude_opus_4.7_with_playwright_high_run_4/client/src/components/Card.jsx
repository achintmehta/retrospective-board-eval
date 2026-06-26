import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';

export default function Card({ card, index, onAddComment }) {
  const [expanded, setExpanded] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');

  function submitComment(e) {
    e.preventDefault();
    const text = commentDraft.trim();
    if (!text) return;
    onAddComment(card.id, text);
    setCommentDraft('');
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card ${snapshot.isDragging ? 'dragging' : ''}`}
        >
          <p className="card-content">{card.content}</p>
          <div className="card-meta">
            <span className="muted">{card.author_name}</span>
            <button
              type="button"
              className="link-button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {card.comments?.length || 0} 💬
            </button>
          </div>
          {expanded && (
            <div className="comments">
              {(card.comments || []).length === 0 && (
                <p className="muted small">No comments yet.</p>
              )}
              {(card.comments || []).map((c) => (
                <div key={c.id} className="comment">
                  <strong>{c.author_name}</strong>
                  <span>{c.content}</span>
                </div>
              ))}
              <form className="comment-form" onSubmit={submitComment}>
                <input
                  type="text"
                  placeholder="Add a comment"
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  maxLength={5000}
                  aria-label="Comment text"
                />
                <button type="submit" disabled={!commentDraft.trim()}>Post</button>
              </form>
            </div>
          )}
        </article>
      )}
    </Draggable>
  );
}
