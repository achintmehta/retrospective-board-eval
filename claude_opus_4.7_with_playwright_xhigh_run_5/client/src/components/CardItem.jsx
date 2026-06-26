import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';

export default function CardItem({ card, index, onAddComment }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  function handleSubmitComment(e) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    onAddComment(card.id, text);
    setCommentText('');
  }

  const comments = card.comments || [];

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          className={`card ${snapshot.isDragging ? 'dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <div className="card-content">{card.content}</div>
          <div className="card-meta">
            <span className="author">{card.author_name}</span>
            <button
              type="button"
              className="link-btn"
              onClick={() => setShowComments((v) => !v)}
            >
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              {showComments ? ' ▲' : ' ▼'}
            </button>
          </div>
          {showComments && (
            <div className="comments">
              <ul>
                {comments.map((c) => (
                  <li key={c.id} className="comment">
                    <span className="comment-author">{c.author_name}:</span>{' '}
                    <span>{c.content}</span>
                  </li>
                ))}
              </ul>
              <form onSubmit={handleSubmitComment} className="comment-form">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  maxLength={500}
                  aria-label="Add comment"
                />
                <button type="submit" disabled={!commentText.trim()}>
                  Post
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
