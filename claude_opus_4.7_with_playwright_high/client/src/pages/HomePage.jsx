import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .listBoards()
      .then((data) => setBoards(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      const board = await api.createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>Retro Boards</h1>
      </header>

      <section className="card-panel">
        <h2>Create a new board</h2>
        <form className="row" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Sprint 42 Retrospective"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <button type="submit" disabled={!title.trim()}>
            Create
          </button>
        </form>
      </section>

      <section className="card-panel">
        <h2>Existing boards</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p>Loading…</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet. Create one to get started.</p>
        ) : (
          <ul className="board-list">
            {boards.map((b) => (
              <li key={b.id}>
                <Link to={`/boards/${b.id}`}>{b.title}</Link>
                <span className="muted">
                  {' '}
                  · {new Date(b.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
