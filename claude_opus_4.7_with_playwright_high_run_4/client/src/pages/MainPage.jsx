import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const data = await api.listBoards();
      setBoards(data);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setCreating(true);
    try {
      await api.createBoard(t);
      setTitle('');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="main-page">
      <section className="card-panel">
        <h1>Retrospective boards</h1>
        <form className="create-board-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="New board title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            aria-label="New board title"
          />
          <button type="submit" disabled={creating || !title.trim()}>
            {creating ? 'Creating…' : 'Create board'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card-panel">
        <h2>All boards</h2>
        {loading ? (
          <p>Loading…</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet. Create one above.</p>
        ) : (
          <ul className="board-list">
            {boards.map((b) => (
              <li key={b.id}>
                <Link to={`/boards/${b.id}`}>{b.title}</Link>
                <span className="muted">
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
