import { useState, FormEvent } from 'react';
import type { Card } from '../pages/BoardPage';

interface CommentsPanelProps {
  card: Card;
  onClose: () => void;
  onAddComment: (cardId: string, content: string) => void;
}

export default function CommentsPanel({ card, onClose, onAddComment }: CommentsPanelProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAddComment(card.id, content.trim());
    setContent('');
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="comments-overlay" onClick={onClose} />
      <div className="comments-panel">
        <div className="comments-header">
          <h3>Comments</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} id="close-comments-btn">
            ✕
          </button>
        </div>

        <div className="comments-card-preview">{card.content}</div>

        <div className="comments-list">
          {card.comments.length === 0 ? (
            <div className="no-comments">No comments yet. Be the first!</div>
          ) : (
            card.comments.map(comment => (
              <div key={comment.id} className="comment">
                <span className="comment-author">{comment.author_name}</span>
                <span className="comment-content">{comment.content}</span>
                <span className="comment-time">{formatTime(comment.created_at)}</span>
              </div>
            ))
          )}
        </div>

        <form className="comments-input" onSubmit={handleSubmit}>
          <input
            className="input"
            type="text"
            placeholder="Write a comment..."
            value={content}
            onChange={e => setContent(e.target.value)}
            id="comment-input"
          />
          <button className="btn btn-primary btn-sm" type="submit" id="submit-comment-btn">
            Send
          </button>
        </form>
      </div>
    </>
  );
}
