import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

function formatDate(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch (e) { return ''; }
}

export default function MainPage() {
  const [boards, setBoards] = useState(null);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    api.listBoards()
      .then((data) => { if (mounted) setBoards(data); })
      .catch((err) => { if (mounted) { setError(err.message); setBoards([]); } });
    return () => { mounted = false; };
  }, []);

  async function createBoard(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    setError('');
    try {
      const board = await api.createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create board');
      setCreating(false);
    }
  }

  return (
    <>
      <section className="hero">
        <h1>Retrospectives that move at the speed of your team.</h1>
        <p>
          Spin up a board, drop in some sticky notes, drag, comment, and ship outcomes — all live,
          all self-hosted, zero accounts.
        </p>
      </section>

      <form className="glass create-board-card" onSubmit={createBoard}>
        <div className="field">
          <label htmlFor="board-title">Start a new retro</label>
          <input
            id="board-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sprint 42 retro · Platform Squad"
            maxLength={120}
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!title.trim() || creating}
        >
          {creating ? 'Creating…' : 'Create board'} <span aria-hidden="true">→</span>
        </button>
      </form>

      <div className="section-title">
        <h2>Your boards</h2>
        {boards && boards.length > 0 && (
          <span className="text-dim" style={{ fontSize: '0.86rem' }}>
            {boards.length} board{boards.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {error && <div className="toast">{error}</div>}

      {boards === null ? (
        <div className="board-grid" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 132 }} />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className="empty-state">
          <strong style={{ color: 'var(--c-text)' }}>No boards yet</strong>
          <span>Create your first retro above — it takes about three seconds.</span>
        </div>
      ) : (
        <div className="board-grid">
          {boards.map((b) => (
            <Link key={b.id} to={`/boards/${b.id}`} className="board-tile">
              <div className="tile-arrow" aria-hidden="true">
                <ArrowIcon />
              </div>
              <h3>{b.title}</h3>
              <div className="meta">
                <span>{formatDate(b.created_at)}</span>
                <span aria-hidden="true">·</span>
                <span>{b.column_count} columns</span>
                <span aria-hidden="true">·</span>
                <span>{b.card_count} cards</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}
