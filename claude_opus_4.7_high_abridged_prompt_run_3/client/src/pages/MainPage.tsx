import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, Board } from '../api';

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MainPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    api
      .listBoards()
      .then((data) => alive && setBoards(data))
      .catch((e) => alive && setError((e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const board = await api.createBoard(trimmed);
      setTitle('');
      navigate(`/boards/${board.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="main-page">
      <section className="hero">
        <div className="hero-content">
          <span className="pill">Real-time · self-hosted</span>
          <h1 className="hero-title">
            Retrospectives that
            <br />
            <span className="grad-text">move at team speed.</span>
          </h1>
          <p className="hero-sub">
            Spin up a board, share the link, drop your cards, discuss. Everything
            syncs live. No accounts, no clutter.
          </p>
          <form onSubmit={handleCreate} className="hero-form">
            <input
              className="input hero-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Name your retro (e.g. Sprint 42 Retrospective)"
              maxLength={120}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-primary hero-btn"
              disabled={submitting || !title.trim()}
            >
              {submitting ? 'Creating…' : 'Create board →'}
            </button>
          </form>
          {error && <p className="error-text">{error}</p>}
        </div>
        <div className="hero-decor" aria-hidden>
          <div className="glow glow-a" />
          <div className="glow glow-b" />
          <div className="glow glow-c" />
        </div>
      </section>

      <section className="boards-section">
        <div className="section-head">
          <h2>Your boards</h2>
          <span className="section-count">{boards.length}</span>
        </div>

        {loading ? (
          <div className="skeleton-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <p>No boards yet. Create one above to get started.</p>
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map((b, i) => (
              <Link
                to={`/boards/${b.id}`}
                key={b.id}
                className="board-card"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="board-card-glow" aria-hidden />
                <div className="board-card-body">
                  <div className="board-card-badge">
                    {b.title.slice(0, 2).toUpperCase()}
                  </div>
                  <h3>{b.title}</h3>
                  <p className="board-card-meta">
                    Created {formatDate(b.created_at)}
                  </p>
                </div>
                <div className="board-card-arrow">→</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
