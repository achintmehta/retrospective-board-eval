import { useState } from 'react';
import CommentSection from './CommentSection.jsx';

export default function Card({ card, dragHandleProps, onAddComment }) {
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="card">
      <div className="card-header" {...dragHandleProps}>
        <span className="card-author">{card.author_name}</span>
      </div>
      <div className="card-content">{card.content}</div>
      <button
        type="button"
        className="comments-toggle"
        onClick={() => setShowComments((v) => !v)}
        aria-expanded={showComments}
      >
        {showComments ? 'Hide' : 'Show'} comments ({card.comments?.length || 0})
      </button>
      {showComments && (
        <CommentSection
          comments={card.comments || []}
          onAdd={(content, done) => onAddComment(card.id, content, done)}
        />
      )}
    </div>
  );
}
