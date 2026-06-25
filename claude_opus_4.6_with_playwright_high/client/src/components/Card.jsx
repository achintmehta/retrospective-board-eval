import { useState } from 'react';

export default function Card({ card, columnId, onAddComment, isDragging }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  function handleSubmitComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(card.id, columnId, commentText.trim());
    setCommentText('');
  }

  return (
    <div style={{
      background: 'var(--card-bg)', padding: 12, borderRadius: 6,
      border: '1px solid var(--border)', fontSize: 14,
      boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
    }}>
      <div style={{ whiteSpace: 'pre-wrap' }}>{card.content}</div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 12, color: 'var(--text-secondary)', marginTop: 8,
      }}>
        <span>{card.author_name}</span>
        <button
          onClick={() => setShowComments(!showComments)}
          style={{
            background: 'none', color: 'var(--primary)', fontSize: 12,
            padding: '2px 6px',
          }}
        >
          {card.comments?.length || 0} comments
        </button>
      </div>

      {showComments && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          {card.comments && card.comments.map(comment => (
            <div key={comment.id} style={{
              fontSize: 13, marginBottom: 6, padding: '6px 8px',
              background: 'var(--column-bg)', borderRadius: 4,
            }}>
              <div>{comment.content}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                {comment.author_name}
              </div>
            </div>
          ))}

          <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              style={{ flex: 1, fontSize: 12, padding: '4px 8px' }}
            />
            <button
              type="submit"
              style={{ background: 'var(--primary)', color: '#fff', fontSize: 12, padding: '4px 10px' }}
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
