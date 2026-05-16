import { useState, useRef, useEffect } from 'react';
import type { Card, Comment } from '../types';

interface Props {
  card: Card;
  onClose: () => void;
  onAddComment: (content: string) => void;
}

export default function CommentDrawer({ card, onClose, onAddComment }: Props) {
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [card.comments?.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setSubmitting(true);
    onAddComment(text);
    setCommentText('');
    setSubmitting(false);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  }

  const comments: Comment[] = card.comments || [];

  return (
    <>
      <div className="comment-drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="comment-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-card-title"
      >
        <div className="drawer-header">
          <div className="drawer-header-content">
            <h3>Card Details</h3>
            <p className="drawer-card-content" id="drawer-card-title">{card.content}</p>
            <p className="drawer-card-author">by {card.author_name}</p>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close drawer"
            id="close-drawer-btn"
          >
            ✕
          </button>
        </div>

        <div className="drawer-body">
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Comments ({comments.length})
          </p>
          {comments.length === 0 ? (
            <div className="no-comments">
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>💬</div>
              <p>No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-author">{comment.author_name}</span>
                  <span className="comment-time">{formatTime(comment.created_at)}</span>
                </div>
                <p className="comment-content">{comment.content}</p>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        <div className="drawer-footer">
          <form className="add-comment-form" onSubmit={handleSubmit}>
            <textarea
              id="comment-textarea"
              className="input textarea"
              placeholder="Write a comment…"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent);
              }}
              disabled={submitting}
              rows={3}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!commentText.trim() || submitting}
              id="submit-comment-btn"
            >
              {submitting ? 'Posting…' : '💬 Post Comment'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
