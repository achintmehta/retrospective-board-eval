import { useState, useEffect, useRef } from 'react';
import { colorForName, initialsFor } from '../lib/identity.js';
import { timeAgo } from '../lib/format.js';
import './CommentDrawer.css';

export default function CommentDrawer({ card, columnTitle, onClose, onSubmit }) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    // Scroll to newest comment when list changes
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [card.comments?.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    const val = draft.trim();
    if (!val) return;
    onSubmit(val);
    setDraft('');
  };

  const cardColor = colorForName(card.author_name);
  const comments = card.comments || [];

  return (
    <div className="drawer-backdrop animate-fade-in" onClick={onClose}>
      <aside className="drawer glass" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-header">
          <div className="drawer-header-top">
            <span className="chip drawer-column-chip">{columnTitle}</span>
            <button className="btn-icon drawer-close" onClick={onClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="drawer-card-preview">
            <div className="drawer-card-content">{card.content}</div>
            <div className="drawer-card-author">
              <span
                className="drawer-card-avatar"
                style={{ background: `linear-gradient(135deg, ${cardColor}, ${cardColor}aa)` }}
              >
                {initialsFor(card.author_name)}
              </span>
              <span>{card.author_name}</span>
              <span className="drawer-card-time">· {timeAgo(card.created_at)}</span>
            </div>
          </div>
        </header>

        <div className="drawer-comments-header">
          <h4>
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </h4>
        </div>

        <div className="drawer-comments" ref={listRef}>
          {comments.length === 0 ? (
            <div className="drawer-empty">
              <div className="drawer-empty-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p>Start the conversation.</p>
            </div>
          ) : (
            comments.map((c) => {
              const color = colorForName(c.author_name);
              return (
                <div key={c.id} className="comment animate-fade-in">
                  <span
                    className="comment-avatar"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
                    title={c.author_name}
                  >
                    {initialsFor(c.author_name)}
                  </span>
                  <div className="comment-body">
                    <div className="comment-head">
                      <span className="comment-author">{c.author_name}</span>
                      <span className="comment-time">{timeAgo(c.created_at)}</span>
                    </div>
                    <div className="comment-content">{c.content}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={submit} className="drawer-form">
          <textarea
            ref={textareaRef}
            className="textarea"
            placeholder="Write a comment…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
            }}
            rows={2}
            maxLength={2000}
          />
          <div className="drawer-form-actions">
            <span className="drawer-form-hint">⌘/Ctrl + Enter to send</span>
            <button className="btn btn-primary" disabled={!draft.trim()}>
              Send
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
