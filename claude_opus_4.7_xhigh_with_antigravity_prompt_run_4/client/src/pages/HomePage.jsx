import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

function formatDate(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  if (same) {
    return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api
      .listBoards()
      .then((list) => {
        if (active) {
          setBoards(list);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
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
    <div className="home-page">
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="hero-pulse" /> Live & self-hosted
        </div>
        <h1 className="hero-title">
          Run honest retros.
          <br />
          <span className="gradient-text">In real-time.</span>
        </h1>
        <p className="hero-sub">
          Spin up a board, share the link, and watch sticky notes appear as your team types —
          no accounts, no SaaS lock-in. Just retrospectives that flow.
        </p>

        <form className="hero-form" onSubmit={onCreate} id="create-board-form">
          <label htmlFor="board-title" className="visually-hidden">
            New board title
          </label>
          <input
            id="board-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sprint 42 Retrospective"
            maxLength={120}
            autoComplete="off"
            disabled={creating}
            required
          />
          <button
            type="submit"
            className="btn btn-primary"
            id="create-board-btn"
            disabled={creating || !title.trim()}
          >
            {creating ? 'Creating…' : 'Create board →'}
          </button>
        </form>
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
      </section>

      <section className="board-list-section">
        <header className="section-header">
          <div>
            <h2 className="section-title">Active boards</h2>
            <p className="section-sub">
              {loading
                ? 'Loading…'
                : boards.length === 0
                ? 'No boards yet — create your first above.'
                : `${boards.length} board${boards.length === 1 ? '' : 's'}, newest first.`}
            </p>
          </div>
        </header>

        {loading ? (
          <div className="board-list">
            {[0, 1, 2].map((i) => (
              <div key={i} className="board-card board-card--skeleton" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">
              ✨
            </div>
            <h3>Your team's retros will live here.</h3>
            <p>Create a board above to get started.</p>
          </div>
        ) : (
          <ul className="board-list" id="board-list">
            {boards.map((board, idx) => (
              <li key={board.id} className="board-card-wrap">
                <Link
                  to={`/boards/${board.id}`}
                  className="board-card"
                  id={`board-card-${board.id}`}
                  style={{ '--accent': accentForIndex(idx) }}
                >
                  <div className="board-card-accent" aria-hidden="true" />
                  <div className="board-card-body">
                    <h3 className="board-card-title">{board.title}</h3>
                    <p className="board-card-meta">
                      Created {formatDate(board.created_at)}
                    </p>
                  </div>
                  <div className="board-card-stats">
                    <div>
                      <span className="stat-value">{board.column_count}</span>
                      <span className="stat-label">columns</span>
                    </div>
                    <div>
                      <span className="stat-value">{board.card_count}</span>
                      <span className="stat-label">cards</span>
                    </div>
                  </div>
                  <div className="board-card-cta" aria-hidden="true">
                    Open →
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const ACCENTS = [
  'linear-gradient(135deg, hsl(258 90% 66%), hsl(189 94% 55%))',
  'linear-gradient(135deg, hsl(330 81% 60%), hsl(20 96% 62%))',
  'linear-gradient(135deg, hsl(160 84% 50%), hsl(189 94% 55%))',
  'linear-gradient(135deg, hsl(48 96% 60%), hsl(330 81% 60%))',
  'linear-gradient(135deg, hsl(220 100% 70%), hsl(258 90% 66%))',
];

function accentForIndex(i) {
  return ACCENTS[i % ACCENTS.length];
}
