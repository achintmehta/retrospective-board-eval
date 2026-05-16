import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api.listBoards()
      .then((rows) => { if (!cancelled) setBoards(rows); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const board = await api.createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  return (
    <div className="page page--home">
      <section className="card-panel">
        <h2>Create a board</h2>
        <form onSubmit={handleCreate} className="create-board-form">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sprint 42 Retro"
            maxLength={120}
          />
          <button type="submit" disabled={!title.trim() || creating}>
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card-panel">
        <h2>Boards</h2>
        {loading ? (
          <p>Loading...</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet — create your first one above.</p>
        ) : (
          <ul className="board-list">
            {boards.map((b) => (
              <li key={b.id}>
                <Link to={`/boards/${b.id}`}>{b.title}</Link>
                <span className="muted small">
                  {new Date(b.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
