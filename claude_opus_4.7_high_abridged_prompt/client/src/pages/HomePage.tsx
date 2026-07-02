import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Board } from '../types';

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function HomePage() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.listBoards().then(setBoards).catch((e) => setError(e.message));
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setCreating(true);
    setError(null);
    try {
      const board = await api.createBoard(t);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <section className="hero">
        <span className="hero-eyebrow">Live · Real-time</span>
        <h1>
          Retros that feel <span className="grad">effortless</span>.
        </h1>
        <p>
          Spin up a self-hosted retrospective board in seconds. Drag cards, drop
          comments, and see your team's ideas surface in real time — no signup,
          no SaaS.
        </p>
      </section>

      <div className="home-grid">
        <div className="card-panel">
          <h2>
            Recent boards
            <span className="count">{boards ? boards.length : ''}</span>
          </h2>
          {boards === null ? (
            <div className="spinner" />
          ) : boards.length === 0 ? (
            <div className="empty-state">
              No boards yet — create your first one to get started.
            </div>
          ) : (
            <div className="board-list">
              {boards.map((b) => (
                <div
                  key={b.id}
                  className="board-item"
                  onClick={() => navigate(`/boards/${b.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/boards/${b.id}`);
                  }}
                >
                  <div>
                    <div className="board-item-title">{b.title}</div>
                    <div className="board-item-meta">
                      Created {relativeTime(b.created_at)}
                    </div>
                  </div>
                  <span className="board-item-arrow" aria-hidden>
                    →
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-panel">
          <h2>Start a new retro</h2>
          <form className="form-stack" onSubmit={onCreate}>
            <label className="form-label" htmlFor="board-title">
              Board title
            </label>
            <input
              id="board-title"
              className="input"
              placeholder="e.g. Sprint 42 · Frontend team"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoFocus
            />
            {error && <p className="error-text">{error}</p>}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating || !title.trim()}
            >
              {creating ? 'Creating…' : 'Create board'}
            </button>
            <p style={{ color: 'var(--text-mute)', fontSize: 12, margin: 0 }}>
              Comes pre-loaded with <b>Went Well</b>, <b>Needs Improvement</b>{' '}
              and <b>Action Items</b> columns. Add or drag more anytime.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
