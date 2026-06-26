import React, { useState } from 'react';
import './CardModal.css';

export default function CardModal({ card, onClose, onAddComment, displayName }) {
  const [commentText, setCommentText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(card.id, commentText.trim());
      setCommentText('');
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card-modal glass-card animate-slide-in" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&#10005;</button>

        <div className="card-modal-content">
          <p className="modal-card-text">{card.content}</p>
          <div className="modal-card-meta">
            <span className="modal-card-author">{card.author_name}</span>
          </div>
        </div>

        <div className="comments-section">
          <h3 className="comments-title">
            Comments ({(card.comments || []).length})
          </h3>

          <div className="comments-list">
            {(card.comments || []).length === 0 ? (
              <p className="no-comments">No comments yet. Be the first!</p>
            ) : (
              (card.comments || []).map(comment => (
                <div key={comment.id} className="comment">
                  <div className="comment-header">
                    <span className="comment-avatar">
                      {comment.author_name[0].toUpperCase()}
                    </span>
                    <span className="comment-author">{comment.author_name}</span>
                    <span className="comment-time">{formatTime(comment.created_at)}</span>
                  </div>
                  <p className="comment-text">{comment.content}</p>
                </div>
              ))
            )}
          </div>

          {displayName && (
            <form className="comment-form" onSubmit={handleSubmit}>
              <input
                className="input-field"
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                maxLength={500}
              />
              <button className="btn-primary" type="submit" disabled={!commentText.trim()}>
                Send
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
