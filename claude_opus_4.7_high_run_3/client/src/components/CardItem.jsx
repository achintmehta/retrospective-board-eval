import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';

export default function CardItem({ card, index, onAddComment }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  function handleSubmitComment(e) {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(card.id, trimmed);
    setCommentText('');
  }

  const comments = card.comments || [];

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card ${snapshot.isDragging ? 'is-dragging' : ''}`}
        >
          <div className="card-content">{card.content}</div>
          <div className="card-meta">
            <span className="card-author">{card.author_name}</span>
            <button
              type="button"
              className="comments-toggle"
              onClick={() => setShowComments((s) => !s)}
            >
              {comments.length} 💬
            </button>
          </div>

          {showComments && (
            <div className="comments">
              {comments.length === 0 ? (
                <p className="comments-empty">No comments yet.</p>
              ) : (
                <ul>
                  {comments.map((c) => (
                    <li key={c.id}>
                      <strong>{c.author_name}:</strong> {c.content}
                    </li>
                  ))}
                </ul>
              )}
              <form className="add-comment" onSubmit={handleSubmitComment}>
                <input
                  type="text"
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button type="submit" disabled={!commentText.trim()}>
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
