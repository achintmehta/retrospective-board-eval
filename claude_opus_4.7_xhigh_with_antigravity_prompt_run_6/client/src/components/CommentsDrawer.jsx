import { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar.jsx';
import { formatRelative } from '../lib/time.js';

export default function CommentsDrawer({ card, displayName, onClose, onSubmit, flashingComments }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, [card?.id]);

  useEffect(() => {
    if (!card) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [card, onClose]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [card?.comments?.length]);

  if (!card) return null;

  const submit = (e) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSubmit(card.id, t);
    setText('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" id="comments-drawer">
        <header className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="drawer-title">Card discussion</h2>
            <div className="drawer-card">{card.content}</div>
            <div className="drawer-card-author">
              by <strong style={{ color: 'var(--text-soft)' }}>{card.authorName}</strong> · {formatRelative(card.createdAt)}
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close comments" id="drawer-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="comments-body" ref={bodyRef}>
          {(!card.comments || card.comments.length === 0) ? (
            <div className="comments-empty">No comments yet. Start the conversation.</div>
          ) : (
            card.comments.map((c) => (
              <div
                key={c.id}
                className={`comment ${flashingComments.has(c.id) ? 'comment-flash' : ''}`}
              >
                <Avatar name={c.authorName} />
                <div className="bubble">
                  <div className="head">
                    <strong>{c.authorName}</strong>
                    <span className="when">{formatRelative(c.createdAt)}</span>
                  </div>
                  <div className="body">{c.content}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <form className="comment-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="comment-textarea">Add a comment</label>
          <textarea
            ref={textareaRef}
            id="comment-textarea"
            className="textarea"
            placeholder={`Reply as ${displayName}…  (⌘/Ctrl+Enter to send)`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={2000}
          />
          <div className="comment-form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!text.trim()}
              id="comment-submit"
            >
              Send
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
