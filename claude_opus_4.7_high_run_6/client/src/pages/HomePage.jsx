import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api
      .listBoards()
      .then((data) => {
        if (active) setBoards(data.boards || []);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    setError('');
    try {
      const { board } = await api.createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  return (
    <div className="home-page">
      <section className="card">
        <h1>Create a new retrospective</h1>
        <form onSubmit={handleCreate} className="inline-form">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sprint 42 Retro"
            maxLength={120}
            disabled={creating}
            aria-label="Board title"
          />
          <button type="submit" disabled={creating || !title.trim()}>
            {creating ? 'Creating...' : 'Create board'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>Existing boards</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet. Create one above to get started.</p>
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
