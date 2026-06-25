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
      .then((data) => {
        setBoards(data);
        setError('');
      })
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
    <div className="home">
      <h1>Retrospectives</h1>

      <form className="create-board" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New board title (e.g. Sprint 24 Retro)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" disabled={!title.trim()}>
          Create Board
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <p>Loading boards…</p>
      ) : boards.length === 0 ? (
        <p className="empty">No boards yet. Create your first one above.</p>
      ) : (
        <ul className="board-list">
          {boards.map((b) => (
            <li key={b.id}>
              <Link to={`/boards/${b.id}`}>
                <span className="board-title">{b.title}</span>
                <span className="board-date">
                  {new Date(b.created_at).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
