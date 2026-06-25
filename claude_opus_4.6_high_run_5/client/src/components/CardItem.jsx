import { useState } from 'react';
import './CardItem.css';

function CardItem({ card, onAddComment }) {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');

  function handleAddComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(card.id, commentText.trim());
    setCommentText('');
  }

  return (
    <div className="card-item">
      <div className="card-content">{card.content}</div>
      <div className="card-meta">
        <span className="card-author">{card.author_name}</span>
        <button
          className="comments-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {card.comments?.length || 0} comment{card.comments?.length !== 1 ? 's' : ''}
        </button>
      </div>

      {expanded && (
        <div className="comments-section">
          {card.comments && card.comments.length > 0 && (
            <ul className="comments-list">
              {card.comments.map((comment) => (
                <li key={comment.id} className="comment-item">
                  <span className="comment-author">{comment.author_name}</span>
                  <span className="comment-text">{comment.content}</span>
                </li>
              ))}
            </ul>
          )}
          <form className="comment-form" onSubmit={handleAddComment}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button type="submit">Post</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default CardItem;
