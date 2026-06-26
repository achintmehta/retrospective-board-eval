import { useState, useEffect, useRef } from 'react';

export default function CommentsModal({ card, onClose, onAddComment }) {
  const [content, setContent] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [card.comments.length]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(e) {
    e.preventDefault();
    const t = content.trim();
    if (!t) return;
    onAddComment(t);
    setContent('');
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal modal-wide glass"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Card discussion</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="card-preview">
          <p className="card-content">{card.content}</p>
          <p className="card-author">— {card.author_name}</p>
        </div>

        <div className="comments-list" ref={listRef}>
          {card.comments.length === 0 ? (
            <p className="muted">No comments yet. Start the conversation.</p>
          ) : (
            card.comments.map((c) => (
              <div className="comment" key={c.id}>
                <div className="comment-meta">
                  <strong>{c.author_name}</strong>
                  <span className="muted">{formatTime(c.created_at)}</span>
                </div>
                <div className="comment-body">{c.content}</div>
              </div>
            ))
          )}
        </div>

        <form className="comment-form" onSubmit={submit}>
          <input
            autoFocus
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a reply…"
            maxLength={500}
          />
          <button type="submit" disabled={!content.trim()}>
            Reply
          </button>
        </form>
      </div>
    </div>
  );
}

function formatTime(iso) {
  try {
    const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}
