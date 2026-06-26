import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then((res) => res.json())
      .then((data) => {
        setBoards(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    });
    if (res.ok) {
      const board = await res.json();
      navigate(`/board/${board.id}`);
    }
  };

  return (
    <div className="page-container">
      <header className="app-header">
        <h1><span className="gradient-text">Retro Board</span></h1>
      </header>

      <div className="home-hero">
        <h2>Run better <span className="gradient-text">retrospectives</span></h2>
        <p>Create a board, invite your team, and collaborate in real-time. No sign-up required.</p>
      </div>

      <div className="create-board-section">
        <form className="create-board-form" onSubmit={handleCreate}>
          <input
            id="board-title-input"
            type="text"
            placeholder="Enter board name..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary" id="create-board-btn">
            Create Board
          </button>
        </form>
      </div>

      <div className="boards-list">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            Loading boards...
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <p>No boards yet. Create your first retrospective board above!</p>
          </div>
        ) : (
          <>
            <h3>Your Boards</h3>
            <div className="boards-grid">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  to={`/board/${board.id}`}
                  className="board-card"
                  id={`board-card-${board.id}`}
                >
                  <h4>{board.title}</h4>
                  <span className="board-date">
                    {new Date(board.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
