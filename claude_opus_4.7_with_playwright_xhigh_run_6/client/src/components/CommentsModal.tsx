import { useState, type FormEvent } from "react";
import type { Card } from "../types";

type Props = {
  card: Card;
  onClose: () => void;
  onSubmit: (content: string) => void;
};

function formatTime(value: string): string {
  try {
    return new Date(value + "Z").toLocaleString();
  } catch {
    return value;
  }
}

export default function CommentsModal({ card, onClose, onSubmit }: Props) {
  const [content, setContent] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setContent("");
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal comments-modal" onClick={(e) => e.stopPropagation()}>
        <header className="comments-modal-header">
          <div>
            <h2>Card</h2>
            <p className="card-author muted">by {card.authorName}</p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <p className="card-content">{card.content}</p>

        <section className="comments-section">
          <h3>Comments ({card.comments.length})</h3>
          {card.comments.length === 0 && (
            <p className="muted">No comments yet. Be the first to reply.</p>
          )}
          <ul className="comment-list">
            {card.comments.map((comment) => (
              <li key={comment.id} className="comment-item">
                <div className="comment-meta">
                  <strong>{comment.authorName}</strong>
                  <span className="muted">{formatTime(comment.createdAt)}</span>
                </div>
                <p className="comment-content">{comment.content}</p>
              </li>
            ))}
          </ul>

          <form className="add-comment-form" onSubmit={handleSubmit}>
            <textarea
              placeholder="Reply…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
            />
            <button type="submit" disabled={!content.trim()}>
              Post reply
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
