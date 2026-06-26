import { useState, useRef, useEffect } from 'react';
import './CommentPanel.css';

export default function CommentPanel({ card, onClose, onAddComment }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [card?.comments?.length]);

  if (!card) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddComment(card.id, text.trim());
    setText('');
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr + 'Z').toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="comment-overlay" onClick={onClose}>
      <div className="comment-panel glass-panel animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="comment-panel-header">
          <h3>Comments</h3>
          <button className="close-btn" onClick={onClose} id="close-comments-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="comment-card-preview">
          <p>{card.content}</p>
          <span className="comment-card-author">by {card.author_name}</span>
        </div>

        <div className="comments-list" ref={listRef}>
          {(!card.comments || card.comments.length === 0) ? (
            <div className="no-comments">
              <p>No comments yet. Be the first!</p>
            </div>
          ) : (
            card.comments.map((c) => (
              <div key={c.id} className="comment-item animate-fade-in">
                <div className="comment-bubble">
                  <p>{c.content}</p>
                </div>
                <div className="comment-info">
                  <span className="comment-author">{c.author_name}</span>
                  <span className="comment-time">{formatTime(c.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <form className="comment-input-form" onSubmit={handleSubmit}>
          <input
            className="input-field"
            type="text"
            placeholder="Write a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            id="comment-input"
          />
          <button type="submit" className="btn-primary" id="submit-comment-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
