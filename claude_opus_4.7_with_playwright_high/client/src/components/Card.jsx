import { useState } from 'react';

export default function Card({ card, open, onToggleComments, onAddComment }) {
  const [draft, setDraft] = useState('');

  function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddComment(text);
    setDraft('');
  }

  return (
    <article className="card">
      <p className="card-content">{card.content}</p>
      <footer className="card-meta">
        <span className="muted">— {card.author_name}</span>
        <button
          type="button"
          className="link-button"
          onClick={onToggleComments}
        >
          {open ? 'Hide' : 'Comments'} ({card.comments.length})
        </button>
      </footer>

      {open && (
        <section className="comments">
          {card.comments.length === 0 ? (
            <p className="muted small">No comments yet.</p>
          ) : (
            <ul>
              {card.comments.map((c) => (
                <li key={c.id}>
                  <strong>{c.author_name}:</strong> {c.content}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={submit} className="comment-composer">
            <input
              type="text"
              placeholder="Add a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
            />
            <button type="submit" disabled={!draft.trim()}>
              Post
            </button>
          </form>
        </section>
      )}
    </article>
  );
}
