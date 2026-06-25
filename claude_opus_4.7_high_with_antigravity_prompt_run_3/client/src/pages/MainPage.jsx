import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Prism — Real-time Retrospective Boards';
    let mounted = true;
    api
      .listBoards()
      .then((data) => mounted && setBoards(data.boards || []))
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const { board } = await api.createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <section className="main-page">
      <div className="hero">
        <div className="hero__intro">
          <span className="hero__eyebrow">Live · Self-hosted · Zero setup</span>
          <h1 className="hero__title">
            Run retrospectives <span className="grad">that actually move teams forward.</span>
          </h1>
          <p className="hero__lede">
            Create a board, share the link, type your name. Cards, comments, and movement sync
            instantly across every connected teammate — no accounts, no SaaS, no friction.
          </p>
        </div>

        <form className="create-card" onSubmit={handleCreate} aria-label="Create new board">
          <h2>Start a new retro</h2>
          <p>Give it a name — your team can join with just a link.</p>
          <label className="field-label" htmlFor="new-board-title">
            Board name
          </label>
          <div className="create-card__row">
            <input
              id="new-board-title"
              className="input"
              placeholder="Sprint 24 retrospective"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoFocus
              disabled={submitting}
            />
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting || !title.trim()}
              id="create-board-btn"
            >
              {submitting ? 'Creating…' : 'Create board'}
            </button>
          </div>
          {error && (
            <p style={{ marginTop: 12, color: 'hsl(0 80% 80%)', fontSize: 13 }}>{error}</p>
          )}
        </form>
      </div>

      <div className="section-head">
        <h2>Your boards</h2>
        <span className="section-head__count">
          {loading ? '…' : `${boards.length} ${boards.length === 1 ? 'board' : 'boards'}`}
        </span>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading boards…</span>
        </div>
      ) : boards.length === 0 ? (
        <div className="empty-state">
          <p style={{ margin: 0 }}>
            No boards yet. Create your first retro above to get started.
          </p>
        </div>
      ) : (
        <div className="boards-grid">
          {boards.map((b) => (
            <a key={b.id} href={`/boards/${b.id}`} className="board-card" id={`board-link-${b.id}`}
               onClick={(e) => { e.preventDefault(); navigate(`/boards/${b.id}`); }}>
              <h3 className="board-card__title">{b.title}</h3>
              <span className="board-card__pill">
                <DotIcon /> {b.cardCount} {b.cardCount === 1 ? 'card' : 'cards'}
              </span>
              <div className="board-card__meta">
                <span>{relativeTime(b.createdAt)}</span>
                <span>Open →</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function DotIcon() {
  return (
    <svg viewBox="0 0 8 8" width="8" height="8" aria-hidden="true">
      <circle cx="4" cy="4" r="4" fill="url(#dotGrad)" />
      <defs>
        <linearGradient id="dotGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
