import { useState, type FormEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CardWithComments } from '../types';
import { Avatar } from './Avatar';

function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function CardView({
  card,
  onAddComment,
}: {
  card: CardWithComments;
  onAddComment: (cardId: string, content: string) => void;
}) {
  const [showComments, setShowComments] = useState(card.comments.length > 0);
  const [draft, setDraft] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: 'card', columnId: card.column_id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const submitComment = (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    onAddComment(card.id, content);
    setDraft('');
    setShowComments(true);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card${isDragging ? ' is-dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="card-content">{card.content}</div>
      <div className="card-footer">
        <span className="author">
          <Avatar name={card.author_name} />
          <span>{card.author_name}</span>
          <span className="muted">· {timeAgo(card.created_at)}</span>
        </span>
        <button
          type="button"
          className="comments-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setShowComments((s) => !s);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {card.comments.length}
        </button>
      </div>

      {showComments && (
        <div className="comments" onPointerDown={(e) => e.stopPropagation()}>
          {card.comments.map((c) => (
            <div key={c.id} className="comment">
              <Avatar name={c.author_name} />
              <div className="comment-body">
                <div className="comment-meta">
                  <b>{c.author_name}</b>
                  {timeAgo(c.created_at)} ago
                </div>
                <div className="comment-content">{c.content}</div>
              </div>
            </div>
          ))}
          <form className="comment-form" onSubmit={submitComment}>
            <input
              className="input"
              placeholder="Add a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
            />
            <button className="btn btn-sm btn-primary" disabled={!draft.trim()}>
              Reply
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function CardOverlay({ card }: { card: CardWithComments }) {
  return (
    <div className="card is-overlay">
      <div className="card-content">{card.content}</div>
      <div className="card-footer">
        <span className="author">
          <Avatar name={card.author_name} />
          <span>{card.author_name}</span>
        </span>
      </div>
    </div>
  );
}
