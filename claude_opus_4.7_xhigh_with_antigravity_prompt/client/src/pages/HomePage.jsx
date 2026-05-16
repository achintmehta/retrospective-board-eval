import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toaster.jsx';
import { timeAgo } from '../lib/format.js';

const TILE_PALETTE = [
  { grad: 'linear-gradient(135deg, hsl(265 85% 55% / 0.45), hsl(220 95% 60% / 0.20))', glow: 'hsla(265 95% 70% / 0.22)' },
  { grad: 'linear-gradient(135deg, hsl(190 95% 55% / 0.40), hsl(165 75% 50% / 0.18))', glow: 'hsla(190 95% 60% / 0.22)' },
  { grad: 'linear-gradient(135deg, hsl(330 90% 60% / 0.40), hsl(265 95% 65% / 0.20))', glow: 'hsla(330 90% 65% / 0.22)' },
  { grad: 'linear-gradient(135deg, hsl(38 95% 60% / 0.40), hsl(348 92% 65% / 0.18))', glow: 'hsla(38 95% 60% / 0.20)' },
  { grad: 'linear-gradient(135deg, hsl(150 70% 50% / 0.38), hsl(190 95% 55% / 0.18))', glow: 'hsla(150 70% 55% / 0.20)' },
];

export default function HomePage() {
  const [boards, setBoards] = useState(null);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    api.listBoards()
      .then((data) => { if (!cancelled) setBoards(data); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const board = await api.createBoard(trimmed);
      toast(`Created "${board.title}"`);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      toast(err.message || 'Failed to create board', { kind: 'error' });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <section className="hero" id="hero">
        <span className="eyebrow">
          <span className="dot" /> Self-hosted · Real-time · Zero setup
        </span>
        <h1>
          Run team retrospectives that feel{' '}
          <span className="grad">alive</span>.
        </h1>
        <p className="lead">
          A frictionless retro board for distributed teams. Spin up a session,
          share the link, and watch ideas flow in real time — no accounts,
          no SaaS, no fuss.
        </p>

        <form className="glass create-board" onSubmit={handleCreate} aria-labelledby="create-board-heading">
          <h2 id="create-board-heading" className="sr-only">Create a new board</h2>
          <div className="field">
            <label className="label" htmlFor="board-title">New board title</label>
            <input
              id="board-title"
              className="input"
              placeholder="Sprint 42 retrospective"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            id="create-board-button"
            className="btn btn-primary"
            disabled={!title.trim() || creating}
          >
            {creating ? 'Creating…' : 'Create board →'}
          </button>
        </form>
      </section>

      <section aria-labelledby="boards-heading">
        <div className="section-title">
          <h2 id="boards-heading">Your boards</h2>
          <span className="subtle">
            {boards ? `${boards.length} board${boards.length === 1 ? '' : 's'}` : ' '}
          </span>
        </div>

        {error && (
          <div className="empty-state" role="alert">
            <h3>Couldn't load boards</h3>
            <p>{error}</p>
          </div>
        )}

        {!error && boards === null && (
          <div className="center-state">
            <div>
              <div className="spinner" aria-hidden="true" />
              <p>Loading boards…</p>
            </div>
          </div>
        )}

        {!error && boards && boards.length === 0 && (
          <div className="empty-state">
            <h3>No boards yet</h3>
            <p>Create your first retrospective above and share the link with your team.</p>
          </div>
        )}

        {boards && boards.length > 0 && (
          <div className="board-grid" id="board-grid">
            {boards.map((board, idx) => {
              const accent = TILE_PALETTE[idx % TILE_PALETTE.length];
              return (
                <Link
                  key={board.id}
                  to={`/boards/${board.id}`}
                  className="board-tile"
                  id={`board-tile-${board.id}`}
                  style={{ '--tile-grad': accent.grad, '--tile-glow': accent.glow }}
                >
                  <div>
                    <div className="title">{board.title}</div>
                  </div>
                  <div className="meta">
                    <span title={new Date(board.createdAt).toLocaleString()}>
                      {timeAgo(board.createdAt)}
                    </span>
                    <span className="stats">
                      <span title="Cards">📝 {board.cardCount}</span>
                      <span title="Comments">💬 {board.commentCount}</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
