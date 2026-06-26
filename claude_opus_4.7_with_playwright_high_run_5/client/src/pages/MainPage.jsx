import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    api
      .listBoards()
      .then((list) => alive && setBoards(list))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const board = await api.createBoard(title.trim());
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="main-page">
      <section className="card">
        <h2>Create a new board</h2>
        <form onSubmit={onCreate} className="create-form">
          <input
            type="text"
            placeholder="Board title (e.g. Sprint 23 Retro)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            aria-label="Board title"
          />
          <button type="submit" disabled={!title.trim() || submitting}>
            {submitting ? 'Creating…' : 'Create Board'}
          </button>
        </form>
        <p className="hint">
          New boards start with three default columns: Went Well, Needs Improvement, Action Items.
        </p>
      </section>

      <section className="card">
        <h2>Existing boards</h2>
        {loading && <p>Loading…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && boards.length === 0 && <p>No boards yet — create one above.</p>}
        <ul className="board-list">
          {boards.map((b) => (
            <li key={b.id}>
              <Link to={`/boards/${b.id}`}>
                <strong>{b.title}</strong>
                <span className="muted">
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
