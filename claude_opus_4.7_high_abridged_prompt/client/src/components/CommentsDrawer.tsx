import { FormEvent, useEffect, useRef, useState } from 'react';
import type { Card, Comment } from '../types';

interface Props {
  card: Card;
  comments: Comment[];
  onClose: () => void;
  onAdd: (content: string) => void;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CommentsDrawer({ card, comments, onClose, onAdd }: Props) {
  const [text, setText] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [comments.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText('');
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="comments-drawer" role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div>
            <h3>Comments</h3>
            <div className="card-preview">{card.content}</div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="drawer-body" ref={bodyRef}>
          {comments.length === 0 ? (
            <div className="empty-state">Be the first to reply.</div>
          ) : (
            comments.map((c) => (
              <div className="comment" key={c.id}>
                <div className="comment-head">
                  <span className="avatar">{initials(c.author_name)}</span>
                  <b style={{ color: 'var(--text)' }}>{c.author_name}</b>
                  <span>· {formatTime(c.created_at)}</span>
                </div>
                <div className="comment-body">{c.content}</div>
              </div>
            ))
          )}
        </div>
        <form className="drawer-footer" onSubmit={submit}>
          <textarea
            className="textarea"
            placeholder="Add a comment… (Enter to submit, Shift+Enter for new line)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit(e as unknown as FormEvent);
              }
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!text.trim()}
          >
            Post comment
          </button>
        </form>
      </aside>
    </>
  );
}
