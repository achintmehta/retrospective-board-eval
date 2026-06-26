import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    setError('');
    const t = title.trim();
    if (!t) return;
    try {
      const board = await api.createBoard(t);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="home-page">
      <section className="card create-card">
        <h2>Create a new retrospective</h2>
        <form onSubmit={handleCreate} className="create-form">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sprint 42 retro"
            aria-label="Board title"
            required
          />
          <button type="submit" className="btn btn-primary">
            Create Board
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>Existing Boards</h2>
        {loading ? (
          <p>Loading…</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet — create your first above.</p>
        ) : (
          <ul className="board-list">
            {boards.map((b) => (
              <li key={b.id}>
                <Link to={`/boards/${b.id}`} className="board-link">
                  <span className="board-title">{b.title}</span>
                  <span className="board-date">
                    {new Date(b.created_at + 'Z').toLocaleString()}
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
