import { useMemo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CardRow } from '../types';
import './RetroCard.css';

interface RetroCardProps {
  id: string;
  card: CardRow;
  isDragging: boolean;
  expanded: boolean;
  currentUser: string;
  onOpen: () => void;
  onCollapse: () => void;
  onSubmitComment: (content: string) => void;
}

/**
 * Deterministic gradient assignment for author avatars so the same person
 * gets the same swatch across cards without needing a shared registry.
 */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #7c5cff, #22d3ee)',
  'linear-gradient(135deg, #f472b6, #fbbf24)',
  'linear-gradient(135deg, #34d399, #22d3ee)',
  'linear-gradient(135deg, #a78bfa, #f472b6)',
  'linear-gradient(135deg, #22d3ee, #7c5cff)',
  'linear-gradient(135deg, #fb7185, #f472b6)',
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
}

function gradientFor(name: string): string {
  return AVATAR_GRADIENTS[hashString(name) % AVATAR_GRADIENTS.length];
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 30) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function RetroCard({
  id,
  card,
  isDragging,
  expanded,
  currentUser,
  onOpen,
  onCollapse,
  onSubmitComment,
}: RetroCardProps) {
  const [comment, setComment] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({ id });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging || sortableDragging ? 0 : 1,
    }),
    [transform, transition, isDragging, sortableDragging]
  );

  const commentCount = card.comments.length;

  const submitComment = () => {
    const clean = comment.trim();
    if (!clean) return;
    onSubmitComment(clean);
    setComment('');
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`retro-card ${expanded ? 'expanded' : ''}`}
      {...attributes}
    >
      <div className="retro-card-drag-handle" {...listeners} aria-label="Drag card">
        <div className="retro-card-body" onClick={expanded ? undefined : onOpen}>
          <p className="retro-card-content">{card.content}</p>
          <footer className="retro-card-footer">
            <div className="author">
              <span className="avatar" style={{ background: gradientFor(card.author_name) }}>
                {initials(card.author_name)}
              </span>
              <div className="author-meta">
                <span className="author-name">{card.author_name}</span>
                <span className="author-time">{relativeTime(card.created_at)}</span>
              </div>
            </div>
            <div className="footer-actions">
              {commentCount > 0 && (
                <span className="chip" title={`${commentCount} comment${commentCount === 1 ? '' : 's'}`}>
                  <span aria-hidden>💬</span>
                  {commentCount}
                </span>
              )}
            </div>
          </footer>
        </div>
      </div>

      {expanded && (
        <div className="retro-card-comments fade-in">
          <div className="comments-header">
            <span className="text-tertiary tiny">Comments</span>
            <button className="btn btn-ghost btn-sm" onClick={onCollapse}>
              Close
            </button>
          </div>

          {card.comments.length === 0 ? (
            <p className="text-tertiary small" style={{ margin: '4px 0 12px' }}>
              No replies yet. Start the thread.
            </p>
          ) : (
            <ul className="comments-list">
              {card.comments.map((c) => (
                <li key={c.id} className="comment fade-up">
                  <span
                    className="avatar avatar-sm"
                    style={{ background: gradientFor(c.author_name) }}
                    title={c.author_name}
                  >
                    {initials(c.author_name)}
                  </span>
                  <div className="comment-body">
                    <div className="comment-meta">
                      <span className="comment-author">{c.author_name}</span>
                      <span className="comment-time">{relativeTime(c.created_at)}</span>
                    </div>
                    <p>{c.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="comment-composer">
            <span
              className="avatar avatar-sm"
              style={{ background: gradientFor(currentUser) }}
              title={currentUser}
            >
              {initials(currentUser)}
            </span>
            <input
              className="input comment-input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
              placeholder="Reply as yourself…"
              maxLength={500}
            />
            <button
              className="btn btn-primary btn-sm"
              disabled={!comment.trim()}
              onClick={submitComment}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

/**
 * A visually identical card used inside DragOverlay. It doesn't participate
 * in sortable, so it's a plain render of the card content.
 */
export function RetroCardOverlay({ card }: { card: CardRow }) {
  return (
    <article className="retro-card retro-card-overlay">
      <div className="retro-card-body">
        <p className="retro-card-content">{card.content}</p>
        <footer className="retro-card-footer">
          <div className="author">
            <span className="avatar" style={{ background: gradientFor(card.author_name) }}>
              {initials(card.author_name)}
            </span>
            <div className="author-meta">
              <span className="author-name">{card.author_name}</span>
              <span className="author-time">moving…</span>
            </div>
          </div>
        </footer>
      </div>
    </article>
  );
}
