import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { initials } from '../useDisplayName.js';

export default function Card({ card, index, displayName, onAddComment }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const commentCount = (card.comments || []).length;

  function submitComment(e) {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(card.id, trimmed);
    setCommentText('');
    setShowComments(true);
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card ${snapshot.isDragging ? 'dragging' : ''}`}
          style={provided.draggableProps.style}
        >
          <div className="card-content">{card.content}</div>
          <div className="card-meta">
            <span className="author-chip">
              <span className="av-mini" aria-hidden="true">{initials(card.author_name)}</span>
              {card.author_name}
            </span>
            <div className="card-actions">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowComments((v) => !v)}
                aria-expanded={showComments}
                aria-label={`${commentCount} comment${commentCount === 1 ? '' : 's'}`}
              >
                <CommentIcon /> {commentCount}
              </button>
            </div>
          </div>

          {showComments && (
            <div className="comments">
              {(card.comments || []).map((c) => (
                <div key={c.id} className="comment">
                  <span className="av-mini" aria-hidden="true">{initials(c.author_name)}</span>
                  <div className="comment-body">
                    <div className="author-chip" style={{ marginBottom: 2 }}>{c.author_name}</div>
                    <div>{c.content}</div>
                  </div>
                </div>
              ))}
              <form className="comment-form" onSubmit={submitComment}>
                <input
                  className="input"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={`Reply as ${displayName || 'you'}…`}
                  maxLength={1000}
                />
                <button type="submit" disabled={!commentText.trim()}>Send</button>
              </form>
            </div>
          )}
        </article>
      )}
    </Draggable>
  );
}

function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
