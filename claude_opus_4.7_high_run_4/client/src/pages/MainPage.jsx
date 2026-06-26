import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .listBoards()
      .then(setBoards)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      const board = await api.createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (e) {
      setError(e.message);
      setCreating(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Retro Boards</h1>
        <span className="muted">
          Self-hosted real-time retrospectives
        </span>
      </header>

      <form className="create-board" onSubmit={handleCreate}>
        <input
          aria-label="Board title"
          placeholder="New board title (e.g. Sprint 42 Retro)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={creating}
        />
        <button
          className="primary"
          type="submit"
          disabled={creating || !title.trim()}
        >
          {creating ? 'Creating…' : 'Create board'}
        </button>
      </form>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {loading ? (
        <p className="muted">Loading boards…</p>
      ) : boards.length === 0 ? (
        <p className="empty">No boards yet — create your first one above.</p>
      ) : (
        <div className="board-list">
          {boards.map((b) => (
            <Link key={b.id} to={`/boards/${b.id}`} className="board-card">
              <h3>{b.title}</h3>
              <span className="muted">
                Created {new Date(b.created_at + 'Z').toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
