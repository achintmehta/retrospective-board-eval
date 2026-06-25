import { useState } from 'react';

function CommentModal({ card, onClose, onAddComment }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddComment(card.id, text.trim());
    setText('');
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal comment-modal" onClick={e => e.stopPropagation()}>
        <h2>Comments</h2>
        <div className="card-preview">{card.content}</div>

        <div className="comments-list">
          {(!card.comments || card.comments.length === 0) ? (
            <div className="no-comments">No comments yet. Be the first to share your thoughts.</div>
          ) : (
            card.comments.map(comment => (
              <div key={comment.id} className="comment-item">
                <div className="comment-item-header">
                  <span className="comment-item-author">{comment.author_name}</span>
                  <span className="comment-item-date">{formatDate(comment.created_at)}</span>
                </div>
                <div className="comment-item-text">{comment.content}</div>
              </div>
            ))
          )}
        </div>

        <form className="comment-input-wrap" onSubmit={handleSubmit}>
          <input
            className="input-field"
            type="text"
            placeholder="Write a comment..."
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary">Send</button>
        </form>
      </div>
    </div>
  );
}

export default CommentModal;
