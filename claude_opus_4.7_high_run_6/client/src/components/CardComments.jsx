import { useState } from 'react';

export default function CardComments({ comments, onAddComment }) {
  const [content, setContent] = useState('');

  function submit(e) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setContent('');
  }

  return (
    <div className="card-comments">
      {comments.length === 0 ? (
        <p className="muted small">No comments yet.</p>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id}>
              <div className="comment-author">{c.author_name}</div>
              <div className="comment-content">{c.content}</div>
              <div className="comment-meta">
                {new Date(c.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
      <form className="comment-form" onSubmit={submit}>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment"
          maxLength={500}
        />
        <button type="submit" disabled={!content.trim()}>Reply</button>
      </form>
    </div>
  );
}
