import { useState } from 'react';

export default function CommentSection({ comments, onAdd }) {
  const [content, setContent] = useState('');
  const [adding, setAdding] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setAdding(true);
    onAdd(trimmed, () => {
      setContent('');
      setAdding(false);
    });
  };

  return (
    <div className="comment-section">
      <ul className="comment-list">
        {comments.length === 0 ? (
          <li className="muted">No comments yet.</li>
        ) : (
          comments.map((cm) => (
            <li key={cm.id}>
              <strong>{cm.author_name}:</strong> {cm.content}
            </li>
          ))
        )}
      </ul>
      <form onSubmit={submit} className="add-comment-form">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment…"
          maxLength={500}
          aria-label="New comment"
        />
        <button type="submit" disabled={!content.trim() || adding}>
          Reply
        </button>
      </form>
    </div>
  );
}
