import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';

export default function Card({ card, index, onAddComment }) {
  const [expanded, setExpanded] = useState(false);
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
          className={`card ${snapshot.isDragging ? 'card-dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <div className="card-content">{card.content}</div>
          <div className="card-meta">
            <span className="card-author">{card.authorName}</span>
            <button
              type="button"
              className="link-button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {card.comments.length} {card.comments.length === 1 ? 'comment' : 'comments'}
            </button>
          </div>
          {expanded && (
            <div className="card-comments">
              <ul>
                {card.comments.map((c) => (
                  <li key={c.id}>
                    <span className="comment-author">{c.authorName}:</span>{' '}
                    <span className="comment-content">{c.content}</span>
                  </li>
                ))}
              </ul>
              <form onSubmit={submitComment} className="comment-form">
                <input
                  type="text"
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={500}
                  aria-label="New comment"
                />
                <button type="submit" disabled={!commentText.trim()}>Reply</button>
              </form>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
