import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then((r) => r.json())
      .then((data) => {
        setBoards(data);
        setLoading(false);
      });
  }, []);

  const createBoard = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    });
    const board = await res.json();
    navigate(`/board/${board.id}`);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="logo-mark">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h1>RetroBoard</h1>
        </div>
        <p className="tagline">Real-time retrospective collaboration for teams</p>
      </header>

      <section className="create-section animate-slide-up">
        <div className="glass-panel create-card">
          <h2>Start a New Retrospective</h2>
          <form onSubmit={createBoard} className="create-form">
            <input
              className="input-field"
              type="text"
              placeholder="e.g., Sprint 24 Retrospective"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              id="board-title-input"
            />
            <button type="submit" className="btn-primary" id="create-board-btn">
              Create Board
            </button>
          </form>
        </div>
      </section>

      <section className="boards-section">
        <h2 className="section-title">Your Boards</h2>
        {loading ? (
          <div className="loading-state">
            <div className="loader" />
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <p>No boards yet. Create your first retrospective above!</p>
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map((board, i) => (
              <button
                key={board.id}
                className="board-card glass-panel animate-fade-in"
                style={{ animationDelay: `${i * 0.08}s` }}
                onClick={() => navigate(`/board/${board.id}`)}
                id={`board-${board.id}`}
              >
                <div className="board-card-accent" />
                <h3>{board.title}</h3>
                <span className="board-date">{formatDate(board.created_at)}</span>
                <div className="board-arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
