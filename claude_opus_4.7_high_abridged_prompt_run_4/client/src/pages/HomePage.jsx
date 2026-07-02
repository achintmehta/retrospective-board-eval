import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const load = () =>
    api
      .listBoards()
      .then((data) => setBoards(data.boards))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError('');
    try {
      const { board } = await api.createBoard(title.trim());
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Realtime retrospectives</div>
          <h1>
            Boards that stay in sync <span className="grad-text">the instant</span>{' '}
            someone types.
          </h1>
          <p className="lede">
            A zero-setup, self-hosted retro board. Create a session, share the link,
            and watch cards, columns, and comments flow across every screen live.
          </p>
        </div>

        <form className="create-card" onSubmit={handleCreate}>
          <label htmlFor="board-title" className="create-label">
            Start a new retrospective
          </label>
          <div className="create-row">
            <input
              id="board-title"
              placeholder="e.g. Sprint 24 — Team Falcon"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoFocus
            />
            <button className="btn primary" disabled={creating || !title.trim()}>
              {creating ? 'Creating…' : 'Create board'}
              <span className="btn-arrow" aria-hidden>→</span>
            </button>
          </div>
          <div className="create-hint">
            Three default columns are added automatically. Change or add columns
            anytime.
          </div>
          {error && <div className="inline-error">{error}</div>}
        </form>
      </section>

      <section className="boards-section">
        <div className="section-head">
          <h2>Recent boards</h2>
          <span className="section-count">
            {loading ? '…' : `${boards.length} total`}
          </span>
        </div>

        {loading ? (
          <div className="boards-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="board-tile skeleton" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-orb" aria-hidden />
            <h3>No boards yet</h3>
            <p>Create the first one above to kick off your retrospective.</p>
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map((b) => (
              <Link key={b.id} to={`/boards/${b.id}`} className="board-tile">
                <div className="board-tile-top">
                  <div className="board-avatar" aria-hidden>
                    {b.title.trim().charAt(0).toUpperCase() || '·'}
                  </div>
                  <div className="board-meta">
                    <div className="board-title">{b.title}</div>
                    <div className="board-sub">
                      {timeAgo(b.created_at)} · {b.card_count}{' '}
                      {b.card_count === 1 ? 'card' : 'cards'}
                    </div>
                  </div>
                </div>
                <div className="board-cta">
                  Open board <span className="btn-arrow" aria-hidden>→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
