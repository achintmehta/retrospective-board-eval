import { useState } from 'react';

interface Comment {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
}

interface Card {
  id: string;
  content: string;
  comments: Comment[];
}

interface CommentsPanelProps {
  card: Card;
  onClose: () => void;
  onAddComment: (cardId: string, content: string) => void;
}

export function CommentsPanel({ card, onClose, onAddComment }: CommentsPanelProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddComment(card.id, text.trim());
    setText('');
  };

  return (
    <>
      <div className="comments-panel-overlay" onClick={onClose} />
      <div className="comments-panel">
        <div className="comments-panel-header">
          <div>
            <h3>Comments</h3>
            <div className="card-preview">{card.content}</div>
          </div>
          <button className="close-panel-btn" onClick={onClose} id="close-comments-btn">✕</button>
        </div>

        <div className="comments-list">
          {card.comments.length === 0 ? (
            <div className="comments-empty">No comments yet. Be the first!</div>
          ) : (
            card.comments.map(comment => (
              <div className="comment" key={comment.id}>
                <div className="comment-author">{comment.author_name}</div>
                <div className="comment-text">{comment.content}</div>
                <div className="comment-time">
                  {new Date(comment.created_at + 'Z').toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        <form className="add-comment-area" onSubmit={handleSubmit}>
          <input
            id="comment-input"
            type="text"
            placeholder="Write a comment..."
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary btn-sm" id="submit-comment-btn">Send</button>
        </form>
      </div>
    </>
  );
}
