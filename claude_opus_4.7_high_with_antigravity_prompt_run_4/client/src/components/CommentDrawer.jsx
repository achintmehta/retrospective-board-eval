import React, { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CommentDrawer({ card, onClose, onSubmit }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [card?.id]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [card?.comments?.length]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!card) return null;

  async function submit(e) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit(card.id, trimmed);
      setText('');
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
  }

  const comments = card.comments || [];

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Card comments" id="comment-drawer">
        <header className="drawer-header">
          <div style={{ flex: 1 }}>
            <h3>Comments · {comments.length}</h3>
            <div className="drawer-card-preview">{card.content}</div>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            aria-label="Close drawer"
            id="drawer-close-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="drawer-body" ref={bodyRef}>
          {comments.length === 0 && (
            <div style={{ color: 'var(--text-mute)', fontSize: 13.5, padding: '20px 4px' }}>
              No comments yet. Start the thread.
            </div>
          )}
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <Avatar name={c.author_name} size={28} />
              <div className="comment-body">
                <div className="comment-meta">
                  <strong style={{ color: 'var(--text)' }}>{c.author_name}</strong>
                  <span>· {formatTime(c.created_at)}</span>
                </div>
                <div className="comment-content">{c.content}</div>
              </div>
            </div>
          ))}
        </div>

        <form className="drawer-footer" onSubmit={submit}>
          <textarea
            ref={inputRef}
            className="textarea"
            placeholder="Reply to this card… (⌘/Ctrl + Enter to send)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={1000}
          />
          <button type="submit" className="btn btn-primary" disabled={!text.trim() || busy} id="drawer-submit-btn">
            {busy ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      </aside>
    </>
  );
}
