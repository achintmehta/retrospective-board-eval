import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatRelative } from '../lib/format.js';
import { useToast } from '../hooks/useToast.js';
import './HomePage.css';

const SUGGESTED_TITLES = [
  'Sprint 42 Retro',
  'Q4 Launch Retrospective',
  'Onboarding Improvements',
  'Incident Postmortem',
];

export default function HomePage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const { toast, show } = useToast();

  const fetchBoards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listBoards();
      setBoards(Array.isArray(data) ? data : []);
    } catch (err) {
      show(err.message || 'Could not load boards', 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const value = title.trim();
    if (!value || creating) return;
    setCreating(true);
    try {
      const board = await api.createBoard(value);
      setTitle('');
      navigate(`/boards/${board.id}`);
    } catch (err) {
      show(err.message || 'Could not create board', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="home">
      <section className="home-hero">
        <div className="hero-content">
          <span className="badge">
            <span className="badge-dot" />
            Real-time, self-hosted
          </span>
          <h1>
            Retros that feel <span className="hero-gradient">alive</span>.
          </h1>
          <p className="hero-sub">
            Spin up a retrospective board, share the link, and watch ideas land in
            real-time. No accounts. No setup. Just collaboration that flows.
          </p>
          <form className="hero-form glass" onSubmit={handleCreate}>
            <label htmlFor="board-title" className="visually-hidden">
              Board name
            </label>
            <input
              id="board-title"
              className="hero-input"
              type="text"
              placeholder="Name your retro… e.g. Sprint 42 Retro"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!title.trim() || creating}
            >
              {creating ? 'Creating…' : 'Create board'}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M1 7h12m0 0L7.5 1.5M13 7l-5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
          <div className="hero-suggestions">
            <span>Try:</span>
            {SUGGESTED_TITLES.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="suggestion-chip"
                onClick={() => setTitle(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
        <div className="hero-illustration" aria-hidden="true">
          <FloatingCard className="float-card float-card-1" tint="violet" title="🚀 Shipped early" name="Mira" />
          <FloatingCard className="float-card float-card-2" tint="cyan" title="Pairing was 🔥" name="Aaron" />
          <FloatingCard className="float-card float-card-3" tint="pink" title="Standups → 15m" name="Priya" />
        </div>
      </section>

      <section className="home-boards">
        <header className="boards-header">
          <h2>Your boards</h2>
          {boards.length > 0 && (
            <span className="boards-count">
              {boards.length} {boards.length === 1 ? 'board' : 'boards'}
            </span>
          )}
        </header>
        {loading ? (
          <div className="boards-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="board-card-skeleton skeleton" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state glass empty-card">
            <div className="empty-state-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h6m4 0h6M4 12h6m4 0h6M4 18h6m4 0h6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3 style={{ color: 'var(--text-primary)' }}>No boards yet</h3>
            <p>Create your first retrospective to get going.</p>
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map((board) => (
              <Link
                key={board.id}
                to={`/boards/${board.id}`}
                className="board-card glass"
              >
                <div className="board-card-accent" />
                <div className="board-card-body">
                  <h3 className="board-card-title">{board.title}</h3>
                  <div className="board-card-meta">
                    <span>{formatRelative(board.created_at)}</span>
                    <span className="board-card-arrow" aria-hidden="true">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {toast && <div className="toast" role="status">{toast.message}</div>}
    </div>
  );
}

function FloatingCard({ className, tint, title, name }) {
  return (
    <div className={`${className} glass`} data-tint={tint}>
      <div className="float-card-row">
        <span className="float-card-dot" />
        <span className="float-card-name">{name}</span>
      </div>
      <p className="float-card-title">{title}</p>
    </div>
  );
}
