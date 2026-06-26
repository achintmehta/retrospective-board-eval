import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
      .then(data => {
        setBoards(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() })
      });
      const board = await res.json();
      navigate(`/board/${board.id}`);
    } catch {
      setCreating(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="hero-glow" />
        <h1 className="hero-title">
          <span className="hero-icon">&#9670;</span>
          Retro Board
        </h1>
        <p className="hero-subtitle">
          Real-time collaborative retrospectives for agile teams
        </p>
      </div>

      <div className="home-content">
        <form className="create-form glass-card animate-fade-in-up" onSubmit={handleCreate}>
          <h2>Start a new retrospective</h2>
          <div className="form-row">
            <input
              className="input-field"
              type="text"
              placeholder="e.g. Sprint 42 Retro"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
            />
            <button className="btn-primary" type="submit" disabled={creating || !title.trim()}>
              {creating ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>

        <section className="boards-section animate-fade-in-up">
          <h2 className="section-title">Your Boards</h2>
          {loading ? (
            <div className="loading-state">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
          ) : boards.length === 0 ? (
            <div className="empty-state glass-card">
              <div className="empty-icon">&#9881;</div>
              <p>No boards yet. Create your first retrospective above!</p>
            </div>
          ) : (
            <div className="boards-grid">
              {boards.map((board, i) => (
                <button
                  key={board.id}
                  className="board-card glass-card"
                  onClick={() => navigate(`/board/${board.id}`)}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="board-card-accent" />
                  <h3>{board.title}</h3>
                  <span className="board-date">{formatDate(board.created_at)}</span>
                  <span className="board-arrow">&#8594;</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
