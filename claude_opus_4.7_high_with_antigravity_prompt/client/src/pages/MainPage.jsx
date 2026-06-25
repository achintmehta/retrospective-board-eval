import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api
      .listBoards()
      .then((data) => { if (!cancelled) setBoards(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError('');
    try {
      const board = await api.createBoard(trimmed);
      navigate(`/board/${board.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <section className="main-page">
      <div className="hero">
        <div>
          <span className="hero-eyebrow">Live & self-hosted</span>
          <h1 className="hero-title">
            Run retros that <span className="accent">move at the speed of your team</span>.
          </h1>
          <p className="hero-sub">
            Create boards, capture insights, and watch ideas flow across columns in real time.
            Zero login, zero setup — just a display name and you're in.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">{boards.length}</div>
              <div className="hero-stat-label">Boards Created</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">∞</div>
              <div className="hero-stat-label">Collaborators</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">CSV</div>
              <div className="hero-stat-label">One-click Export</div>
            </div>
          </div>
        </div>
        <form className="create-card" onSubmit={handleCreate}>
          <h2 className="create-card-title">Start a new retro</h2>
          <p className="create-card-sub">Spin up a board in seconds — share the link, name yourself, and go.</p>
          <div className="create-form">
            <label className="field-label" htmlFor="board-title">Board name</label>
            <input
              id="board-title"
              className="input"
              type="text"
              maxLength={120}
              placeholder="Sprint 24 — Retrospective"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            {error && <div className="banner banner--error">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={submitting || !title.trim()}>
              {submitting ? 'Creating…' : 'Create Board'}
            </button>
          </div>
        </form>
      </div>

      <section className="boards-section">
        <div className="section-head">
          <h2 className="section-title">Your boards</h2>
          <span className="section-hint">Sorted by most recent</span>
        </div>
        {loading ? (
          <div className="loader-block"><div className="loader" /></div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            No boards yet. Create your first board above to get started — it takes about 2 seconds.
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map((b) => (
              <Link to={`/board/${b.id}`} key={b.id} className="board-card">
                <div>
                  <h3 className="board-card-title">{b.title}</h3>
                  <div className="board-card-meta">
                    <span className="board-card-chip">
                      {b.card_count} {b.card_count === 1 ? 'card' : 'cards'}
                    </span>
                    <span>Created {formatDate(b.created_at)}</span>
                  </div>
                </div>
                <span className="board-card-cta">Open board</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
