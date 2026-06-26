import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createBoard, listBoards } from '../api.js';

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    listBoards()
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

  async function handleSubmit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t || creating) return;
    setCreating(true);
    setError(null);
    try {
      const board = await createBoard(t);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  return (
    <div className="home">
      <section className="card-panel">
        <h1>Retrospective Boards</h1>
        <form className="create-board" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="New board title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            aria-label="Board title"
          />
          <button type="submit" disabled={!title.trim() || creating}>
            {creating ? 'Creating…' : 'Create Board'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card-panel">
        <h2>All Boards</h2>
        {loading ? (
          <p>Loading…</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet. Create your first above.</p>
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
