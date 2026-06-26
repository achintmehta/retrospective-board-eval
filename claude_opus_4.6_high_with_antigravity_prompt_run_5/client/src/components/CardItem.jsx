import React, { useState } from 'react';

export default function CardItem({ card, isDragging, onAddComment }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(card.id, commentText.trim());
    setCommentText('');
  };

  return (
    <div className={`retro-card ${isDragging ? 'dragging' : ''}`}>
      <div className="card-content">{card.content}</div>
      <div className="card-meta">
        <span className="card-author">{card.author_name}</span>
        <button
          className="comment-toggle"
          onClick={() => setShowComments(!showComments)}
          id={`comment-toggle-${card.id}`}
        >
          {card.comments.length > 0
            ? `💬 ${card.comments.length}`
            : '💬 Comment'}
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          {card.comments.map((comment) => (
            <div key={comment.id} className="comment">
              <span className="comment-author">{comment.author_name}</span>
              <span className="comment-text">{comment.content}</span>
            </div>
          ))}
          <form className="comment-form" onSubmit={handleAddComment}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              id={`comment-input-${card.id}`}
            />
            <button type="submit" className="btn-sm primary">
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
