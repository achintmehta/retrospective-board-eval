import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';

export default function Card({ card, index, onAddComment }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');

  const submitComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onAddComment(card.id, comment.trim());
    setComment('');
  };

  const commentCount = card.comments?.length ?? 0;

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          className={`card${snapshot.isDragging ? ' dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <p>{card.content}</p>
          <small className="card-author">— {card.author_name}</small>
          <button
            className="comment-toggle"
            onClick={() => setShowComments((s) => !s)}
          >
            {commentCount} comment{commentCount !== 1 ? 's' : ''}
          </button>

          {showComments && (
            <div className="comments">
              {card.comments?.map((c) => (
                <div key={c.id} className="comment">
                  <p>{c.content}</p>
                  <small>— {c.author_name}</small>
                </div>
              ))}
              <form onSubmit={submitComment} className="comment-form">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <button type="submit">Post</button>
              </form>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
