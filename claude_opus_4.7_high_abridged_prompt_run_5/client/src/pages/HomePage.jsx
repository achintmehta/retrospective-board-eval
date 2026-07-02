import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatRelative } from '../lib/format.js';

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    api
      .listBoards()
      .then((data) => mounted && setBoards(data))
      .catch((e) => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const board = await api.createBoard(trimmed);
      navigate(`/board/${board.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  return (
    <div className="home">
      <section className="hero">
        <div className="eyebrow">Real-time retrospectives</div>
        <h1 className="hero-title">
          Run <span className="hero-accent">honest retros</span>
          <br />in seconds, not spreadsheets.
        </h1>
        <p className="hero-sub">
          A self-hosted, collaborative board that syncs live across your
          team — no signups, no SaaS, no friction.
        </p>

        <form className="create-form" onSubmit={handleCreate}>
          <input
            type="text"
            className="create-input"
            placeholder="Sprint 42 retro, Q3 launch review…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            aria-label="New board title"
          />
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={!title.trim() || creating}
          >
            {creating ? 'Creating…' : 'Create board'}
            <span className="btn-arrow" aria-hidden="true">→</span>
          </button>
        </form>
        {error && <div className="form-error">{error}</div>}
      </section>

      <section className="boards-section">
        <div className="section-head">
          <h2 className="section-title">Your boards</h2>
          <span className="section-count">
            {boards.length} {boards.length === 1 ? 'board' : 'boards'}
          </span>
        </div>

        {loading ? (
          <div className="skeleton-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-illo" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h3>No boards yet</h3>
            <p>Create your first retro board to get started.</p>
          </div>
        ) : (
          <div className="board-grid">
            {boards.map((b) => (
              <Link key={b.id} to={`/board/${b.id}`} className="board-card">
                <div className="board-card-glow" aria-hidden="true" />
                <div className="board-card-body">
                  <h3 className="board-card-title">{b.title}</h3>
                  <div className="board-card-meta">
                    <span className="chip">
                      <span className="chip-dot" />
                      {b.cardCount} {b.cardCount === 1 ? 'card' : 'cards'}
                    </span>
                    <span className="board-card-date">
                      {formatRelative(b.created_at)}
                    </span>
                  </div>
                </div>
                <div className="board-card-arrow" aria-hidden="true">→</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
