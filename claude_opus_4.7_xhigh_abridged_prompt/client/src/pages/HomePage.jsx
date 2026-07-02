import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatRelative } from '../lib/identity.js';
import { useToast } from '../components/Toast.jsx';

function BoardCard({ board }) {
  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`);
  };
  return (
    <Link to={`/board/${board.id}`} className="board-card" onMouseMove={onMove}>
      <div className="board-card-title">{board.title}</div>
      <div className="board-card-meta">
        <span>{formatRelative(board.createdAt)}</span>
        <span>•</span>
        <span>{board.columnCount ?? 0} columns</span>
      </div>
      <div className="board-card-footer">
        <span className={board.cardCount ? 'badge' : 'badge badge-muted'}>
          {board.cardCount ?? 0} {board.cardCount === 1 ? 'card' : 'cards'}
        </span>
        <span className="board-card-open">
          Open
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 5l7 7-7 7" /></svg>
        </span>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await api.listBoards();
        if (alive) setBoards(list);
      } catch (err) {
        toast.error(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  const onCreate = async (event) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean || creating) return;
    setCreating(true);
    try {
      const board = await api.createBoard(clean);
      toast.success(`"${board.title}" is ready`);
      setTitle('');
      navigate(`/board/${board.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <main>
      <section className="container">
        <div className="hero">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            Real-time retrospectives
          </div>
          <h1 className="hero-title">Reflect together, in real time.</h1>
          <p className="hero-sub">
            Spin up a board, drop cards into columns, discuss with your team, and export it all
            when you're done. No accounts, no setup — just paste a link.
          </p>
        </div>

        <div className="create-panel">
          <h2>Start a new retro</h2>
          <p>Boards come pre-configured with Went Well, Needs Improvement, and Action Items.</p>
          <form className="create-form" onSubmit={onCreate}>
            <input
              className="input"
              placeholder="e.g. Sprint 24 Retrospective"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              autoFocus
              aria-label="Board title"
            />
            <button type="submit" className="btn btn-primary" disabled={creating || !title.trim()}>
              {creating ? 'Creating…' : 'Create board'}
              {!creating && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 5l7 7-7 7" /></svg>
              )}
            </button>
          </form>
        </div>

        <div className="section-heading">
          <h2>Your boards</h2>
          <span className="count">{loading ? '' : `${boards.length} total`}</span>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /><span>Loading boards…</span></div>
        ) : boards.length === 0 ? (
          <div className="empty">
            <p>No boards yet. Create your first retrospective above.</p>
          </div>
        ) : (
          <div className="board-grid">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
