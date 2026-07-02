import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch {
    return iso;
  }
}

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    api
      .listBoards()
      .then((data) => alive && setBoards(data))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError('');
    try {
      const board = await api.createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  return (
    <main className="page main-page">
      <header className="hero">
        <div className="hero-eyebrow">
          <span className="pulse-dot" />
          <span>Realtime retrospective board</span>
        </div>
        <h1 className="hero-title">
          Reflect together.
          <span className="hero-title-gradient"> Ship better.</span>
        </h1>
        <p className="hero-sub">
          Frictionless team retros with live cards, threaded comments, and CSV export.
          Zero setup — one container, one database, one link to share.
        </p>
      </header>

      <section className="create-card">
        <div className="create-card-inner">
          <div>
            <h2 className="section-title">Start a new board</h2>
            <p className="section-sub">
              Comes with three default columns you can rename or extend.
            </p>
          </div>
          <form className="create-form" onSubmit={onCreate}>
            <input
              className="text-input"
              placeholder="Sprint 42 retro"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              disabled={creating}
              aria-label="Board title"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!title.trim() || creating}
            >
              {creating ? 'Creating…' : 'Create board'}
              <span className="btn-arrow">→</span>
            </button>
          </form>
          {error && <div className="form-error">{error}</div>}
        </div>
      </section>

      <section className="boards-section">
        <div className="section-header">
          <h2 className="section-title">Your boards</h2>
          <span className="badge">{boards.length}</span>
        </div>

        {loading ? (
          <div className="boards-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="board-card skeleton" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-illustration" aria-hidden="true">
              <div className="empty-orb orb-a" />
              <div className="empty-orb orb-b" />
              <div className="empty-orb orb-c" />
            </div>
            <p>No boards yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map((b) => (
              <Link
                key={b.id}
                to={`/boards/${b.id}`}
                className="board-card"
              >
                <div className="board-card-gradient" aria-hidden="true" />
                <div className="board-card-body">
                  <h3 className="board-card-title">{b.title}</h3>
                  <div className="board-card-meta">
                    <span>{formatDate(b.created_at)}</span>
                    <span className="board-card-count">
                      {b.card_count} {b.card_count === 1 ? 'card' : 'cards'}
                    </span>
                  </div>
                </div>
                <div className="board-card-arrow">↗</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="page-footer">
        <span>Self-hosted • SQLite • Socket.io</span>
      </footer>
    </main>
  );
}
