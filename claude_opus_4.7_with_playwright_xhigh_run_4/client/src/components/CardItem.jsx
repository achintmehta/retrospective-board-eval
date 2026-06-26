import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';

export default function CardItem({ card, index, comments, onAddComment }) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddComment(card.id, trimmed);
    setDraft('');
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <article
          className={`card${snapshot.isDragging ? ' is-dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <p className="card-content">{card.content}</p>
          <div className="card-footer">
            <span className="card-author">{card.author_name}</span>
            <button
              type="button"
              className="link-btn"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={`comments-${card.id}`}
            >
              {comments.length > 0
                ? `${expanded ? 'Hide' : 'Show'} ${comments.length} comment${
                    comments.length === 1 ? '' : 's'
                  }`
                : expanded
                  ? 'Hide comments'
                  : 'Comment'}
            </button>
          </div>
          {expanded && (
            <div id={`comments-${card.id}`} className="comments">
              <ul className="comment-list">
                {comments.length === 0 && (
                  <li className="muted small">No comments yet.</li>
                )}
                {comments.map((c) => (
                  <li key={c.id} className="comment">
                    <p className="comment-content">{c.content}</p>
                    <p className="comment-meta">{c.author_name}</p>
                  </li>
                ))}
              </ul>
              <form className="comment-form" onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add a comment…"
                  maxLength={2000}
                  aria-label="Add a comment"
                />
                <button type="submit" disabled={!draft.trim()}>
                  Reply
                </button>
              </form>
            </div>
          )}
        </article>
      )}
    </Draggable>
  );
}
