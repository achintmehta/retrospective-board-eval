import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listBoards, createBoard } from '../api.js';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listBoards()
      .then((data) => setBoards(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const board = await createBoard(trimmed);
      setBoards((prev) => [board, ...prev]);
      setTitle('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="main-page">
      <section className="card">
        <h2>Create a new board</h2>
        <form onSubmit={handleCreate} className="create-form">
          <input
            type="text"
            placeholder="Sprint 42 Retro"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
          />
          <button type="submit" disabled={submitting || !title.trim()}>
            {submitting ? 'Creating…' : 'Create Board'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Boards</h2>
        {loading && <p className="muted">Loading…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && boards.length === 0 && !error && (
          <p className="muted">No boards yet — create your first one above.</p>
        )}
        <ul className="board-list">
          {boards.map((b) => (
            <li key={b.id}>
              <Link to={`/boards/${b.id}`}>
                <span className="board-name">{b.title}</span>
                <span className="board-meta">
                  {new Date(b.createdAt).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
