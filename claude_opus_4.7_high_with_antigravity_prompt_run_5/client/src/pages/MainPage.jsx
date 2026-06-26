import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';
import './MainPage.css';

export default function MainPage() {
  const [boards, setBoards] = useState(null);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Retro Board · Real-time Team Retrospectives';
    api.listBoards()
      .then(setBoards)
      .catch((e) => setError(e.message));
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    setError('');
    try {
      const board = await api.createBoard(title.trim());
      navigate(`/board/${board.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  return (
    <main className="app-main" id="main-page">
      <section className="hero anim-fade-up">
        <div>
          <span className="hero-eyebrow">
            <span className="status-dot online" /> Real-time · Self-hosted
          </span>
          <h1>
            Run retrospectives that <span className="gradient-text">actually flow</span>.
          </h1>
          <p className="lead">
            A premium, self-hosted real-time board for agile team retrospectives.
            Drop a card, drag it across columns, comment instantly — every change
            syncs to every teammate the moment it happens.
          </p>
          <div className="hero-meta">
            <span>Live collaboration</span>
            <span>Single Docker image</span>
            <span>SQLite-backed</span>
          </div>
        </div>

        <form
          className="card create-card anim-fade-up"
          onSubmit={onCreate}
          id="create-board-form"
        >
          <h3>Create a new board</h3>
          <p className="sub">Start a fresh retrospective in seconds. No accounts needed.</p>
          <div className="create-form">
            <input
              id="new-board-title"
              type="text"
              placeholder="e.g. Sprint 24 Retrospective"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-primary"
              id="create-board-submit"
              disabled={!title.trim() || creating}
            >
              {creating ? 'Creating…' : 'Create board →'}
            </button>
          </div>
          {error && <div className="error-banner" role="alert">{error}</div>}
        </form>
      </section>

      <div className="feature-strip">
        <div className="feature">
          <div className="icon" aria-hidden="true">⚡</div>
          <h4>Instant sync</h4>
          <p>Socket.io rooms broadcast every action — cards, drags, comments — in milliseconds.</p>
        </div>
        <div className="feature">
          <div className="icon" aria-hidden="true">🎯</div>
          <h4>Drag &amp; drop</h4>
          <p>Reorder and move cards between columns with a frictionless dnd-kit experience.</p>
        </div>
        <div className="feature">
          <div className="icon" aria-hidden="true">💾</div>
          <h4>Own your data</h4>
          <p>SQLite volume. Backup, inspect, or export to CSV whenever you need.</p>
        </div>
      </div>

      <div className="section-head">
        <h2>Your boards</h2>
        <span className="count" id="board-count">
          {boards ? `${boards.length} board${boards.length === 1 ? '' : 's'}` : '…'}
        </span>
      </div>

      {boards === null && (
        <div className="empty-state"><p>Loading…</p></div>
      )}

      {boards && boards.length === 0 && (
        <div className="card empty-state" id="empty-boards">
          <h3>No boards yet</h3>
          <p>Create your first board above to kick off a retrospective.</p>
        </div>
      )}

      {boards && boards.length > 0 && (
        <div className="board-grid" id="board-grid">
          {boards.map((b) => (
            <Link
              to={`/board/${b.id}`}
              key={b.id}
              className="board-tile"
              id={`board-tile-${b.id}`}
            >
              <h3>{b.title}</h3>
              <span className="chip">created {timeAgo(b.created_at)}</span>
              <div className="meta">
                <span><b>{b.column_count}</b>columns</span>
                <span><b>{b.card_count}</b>cards</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
