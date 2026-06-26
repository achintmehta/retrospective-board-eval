import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

function formatDate(ms) {
  return new Date(ms).toLocaleString();
}

export default function HomePage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listBoards()
      .then((data) => {
        if (!cancelled) setBoards(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError('');
    try {
      const board = await api.createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  return (
    <div className="home">
      <h1>Retrospective Boards</h1>

      <form className="create-board" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New board title (e.g. Sprint 42 Retro)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          disabled={creating}
        />
        <button className="btn" type="submit" disabled={!title.trim() || creating}>
          {creating ? 'Creating…' : 'Create board'}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loader">Loading boards…</div>
      ) : boards.length === 0 ? (
        <div className="empty-state">
          No boards yet — create your first retrospective above.
        </div>
      ) : (
        <div className="boards-list">
          {boards.map((board) => (
            <Link key={board.id} to={`/boards/${board.id}`} className="board-card">
              <h3>{board.title}</h3>
              <div className="meta">Created {formatDate(board.createdAt)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
