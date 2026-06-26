import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api
      .listBoards()
      .then((data) => {
        if (!cancelled) setBoards(data);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    setError('');
    try {
      const board = await api.createBoard(title.trim());
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  return (
    <div className="home-page">
      <section className="create-board">
        <h1>Start a retrospective</h1>
        <form onSubmit={handleCreate} className="create-board-form">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sprint 42 retro"
            maxLength={120}
            disabled={creating}
            aria-label="New board title"
          />
          <button type="submit" disabled={creating || !title.trim()}>
            {creating ? 'Creating…' : 'Create board'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="board-list">
        <h2>Existing boards</h2>
        {loading ? (
          <p>Loading…</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet. Create your first one above.</p>
        ) : (
          <ul>
            {boards.map((b) => (
              <li key={b.id}>
                <Link to={`/boards/${b.id}`}>
                  <span className="title">{b.title}</span>
                  <span className="created">
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
