import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MainPage.css';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
      .then(data => { setBoards(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
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
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="main-page">
      {/* Header */}
      <header className="main-header">
        <div className="main-header-inner">
          <div className="logo-mark">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="url(#lg)" />
              <path d="M7 9h14M7 14h10M7 19h7" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="28" y2="28">
                  <stop stopColor="#7c3aed" />
                  <stop offset="1" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <span className="logo-text">RetroBoard</span>
          </div>
          <span className="badge">Beta</span>
        </div>
      </header>

      <main className="main-content">
        {/* Hero */}
        <section className="hero-section animate-in">
          <div className="hero-glow" aria-hidden="true" />
          <h1 className="hero-title">
            Run better<br />
            <span className="gradient-text">retrospectives</span>
          </h1>
          <p className="hero-subtitle">
            Collaborate in real-time with your team. Add cards, move them around,
            and export your insights — all without leaving the browser.
          </p>
          <div className="hero-features">
            {['Real-time sync', 'Guest-friendly', 'CSV Export', 'Self-hosted'].map(f => (
              <span key={f} className="feature-chip">{f}</span>
            ))}
          </div>
        </section>

        {/* Create form */}
        <section className="create-section">
          <div className="create-card glass animate-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="create-title">Start a new board</h2>
            <p className="create-subtitle">Give your retrospective a name to get started</p>
            <form onSubmit={handleCreate} className="create-form" id="create-board-form">
              <input
                id="board-title-input"
                type="text"
                placeholder="e.g. Sprint 42 Retrospective"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={80}
                autoFocus
              />
              <button
                id="create-board-btn"
                type="submit"
                className="btn btn-primary"
                disabled={creating || !title.trim()}
              >
                {creating ? (
                  <>
                    <span className="btn-spinner" />
                    Creating…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Create Board
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Boards list */}
        <section className="boards-section">
          <div className="boards-header">
            <h2 className="boards-title">Your boards</h2>
            {!loading && <span className="badge">{boards.length}</span>}
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading boards…</p>
            </div>
          ) : boards.length === 0 ? (
            <div className="empty-state animate-in">
              <div className="empty-icon">🗂️</div>
              <p className="empty-title">No boards yet</p>
              <p className="empty-subtitle">Create your first board above to get started</p>
            </div>
          ) : (
            <div className="boards-grid">
              {boards.map((board, i) => (
                <button
                  key={board.id}
                  id={`board-card-${board.id}`}
                  className="board-card glass animate-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onClick={() => navigate(`/board/${board.id}`)}
                >
                  <div className="board-card-accent" style={{ background: `hsl(${(i * 47) % 360}, 70%, 60%)` }} />
                  <div className="board-card-body">
                    <h3 className="board-card-title">{board.title}</h3>
                    <p className="board-card-date">{formatDate(board.created_at)}</p>
                  </div>
                  <div className="board-card-arrow">→</div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="main-footer">
        <p>RetroBoard — Self-hosted real-time retrospectives</p>
      </footer>
    </div>
  );
}
