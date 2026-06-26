import { useState } from 'react';

function formatTime(ms) {
  return new Date(ms).toLocaleString();
}

export default function CommentDrawer({ card, onClose, onAddComment }) {
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  if (!card) return null;
  const comments = card.comments || [];

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onAddComment(card.id, trimmed);
      setContent('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-header">
          <h3>Comments</h3>
          <button className="btn btn-secondary btn-small" type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="drawer-body">
          <div className="drawer-card">
            <strong>{card.authorName}</strong>
            <div>{card.content}</div>
          </div>
          {comments.length === 0 ? (
            <div className="empty-state">No comments yet.</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="comment">
                <div className="meta">
                  {comment.authorName} · {formatTime(comment.createdAt)}
                </div>
                <div>{comment.content}</div>
              </div>
            ))
          )}
        </div>
        <form className="drawer-footer" onSubmit={handleSubmit}>
          <textarea
            placeholder="Add a comment…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            disabled={busy}
          />
          <div className="modal-actions">
            <button className="btn" type="submit" disabled={!content.trim() || busy}>
              {busy ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
