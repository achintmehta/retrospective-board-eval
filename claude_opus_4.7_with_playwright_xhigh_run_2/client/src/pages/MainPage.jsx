import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function MainPage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.listBoards();
      setBoards(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      const board = await api.createBoard(title.trim());
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page main-page">
      <section className="hero">
        <h1>Run a real-time retrospective</h1>
        <p>Create a board, share the link with your team, and collaborate live.</p>
        <form className="create-board" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Board name (e.g. Sprint 42 retro)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            aria-label="Board name"
          />
          <button type="submit" disabled={!title.trim() || creating}>
            {creating ? 'Creating…' : 'Create board'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="board-list-section">
        <div className="section-head">
          <h2>Your boards</h2>
          <button type="button" className="link-btn" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {loading && boards.length === 0 ? (
          <p className="muted">Loading…</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet. Create your first one above.</p>
        ) : (
          <ul className="board-list">
            {boards.map((b) => (
              <li key={b.id} className="board-card">
                <Link to={`/boards/${b.id}`}>
                  <span className="board-title">{b.title}</span>
                  <span className="board-meta">Created {formatDate(b.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '';
  // SQLite returns "YYYY-MM-DD HH:MM:SS" UTC; treat as UTC for parsing.
  const d = new Date(value.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}
