import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then((r) => r.json())
      .then((data) => { setBoards(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });
      const board = await res.json();
      navigate(`/board/${board.id}`);
    } finally {
      setCreating(false);
    }
  };

  const fmt = (iso) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="page">
      <nav className="navbar">
        <a href="/" className="navbar-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#ng)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs><linearGradient id="ng" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient></defs>
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          RetroBoard
        </a>
      </nav>

      <main className="main-page">
        <h1 className="hero-title">Run Better Retrospectives</h1>
        <p className="hero-sub">Real-time collaboration, no setup required. Create a board and invite your team.</p>

        <div className="create-board-card">
          <h2>Create a New Board</h2>
          <form onSubmit={handleCreate} className="create-board-row">
            <input
              id="new-board-title"
              className="input"
              placeholder="e.g. Sprint 42 Retrospective"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={creating}
              autoComplete="off"
            />
            <button
              id="create-board-btn"
              type="submit"
              className="btn btn-primary"
              disabled={creating || !title.trim()}
            >
              {creating ? 'Creating…' : '+ Create Board'}
            </button>
          </form>
        </div>

        <div className="section-title">
          All Boards <span>{loading ? '' : `${boards.length} board${boards.length !== 1 ? 's' : ''}`}</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="boards-grid">
            {boards.length === 0 ? (
              <div className="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                <p>No boards yet — create one above to get started.</p>
              </div>
            ) : (
              boards.map((b) => (
                <Link key={b.id} to={`/board/${b.id}`} className="board-card" id={`board-${b.id}`}>
                  <div className="board-card-title">{b.title}</div>
                  <div className="board-card-date">Created {fmt(b.created_at)}</div>
                  <span className="board-card-arrow">↗</span>
                </Link>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
