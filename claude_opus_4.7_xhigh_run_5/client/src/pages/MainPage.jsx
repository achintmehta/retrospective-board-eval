import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    api
      .listBoards()
      .then((data) => alive && setBoards(data))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
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
    <div className="main-page">
      <section className="card panel">
        <h2>Create a new board</h2>
        <form className="inline-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Sprint 14 retro"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={creating}
            maxLength={120}
            required
          />
          <button type="submit" disabled={creating || !title.trim()}>
            {creating ? 'Creating...' : 'Create board'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card panel">
        <h2>Existing boards</h2>
        {loading ? (
          <p>Loading...</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet. Create the first one above.</p>
        ) : (
          <ul className="board-list">
            {boards.map((b) => (
              <li key={b.id}>
                <Link to={`/boards/${b.id}`}>
                  <span className="board-title">{b.title}</span>
                  <span className="board-meta">
                    {new Date(b.created_at).toLocaleString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
