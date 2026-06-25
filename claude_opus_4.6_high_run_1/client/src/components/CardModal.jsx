import { useState } from 'react';
import './CardModal.css';

function CardModal({ card, onClose, onAddComment }) {
  const [commentText, setCommentText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(card.id, commentText.trim());
    setCommentText('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-modal-header">
          <h2>Card Details</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="card-modal-body">
          <p className="card-modal-content">{card.content}</p>
          <div className="card-modal-meta">
            <span>By {card.author_name}</span>
            <span>{new Date(card.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="comments-section">
          <h3>Comments ({card.comments.length})</h3>

          <div className="comments-list">
            {card.comments.length === 0 && (
              <p className="no-comments">No comments yet</p>
            )}
            {card.comments.map((comment) => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <span className="comment-author">{comment.author_name}</span>
                  <span className="comment-date">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="comment-text">{comment.content}</p>
              </div>
            ))}
          </div>

          <form className="comment-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button type="submit">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CardModal;
