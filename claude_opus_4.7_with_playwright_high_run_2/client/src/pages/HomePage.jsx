import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBoards, createBoard } from '../api.js';

export default function HomePage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listBoards()
      .then((rows) => !cancelled && setBoards(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const board = await createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="home">
      <section className="card">
        <h2>Create a new board</h2>
        <form onSubmit={onCreate} className="row-form">
          <input
            type="text"
            placeholder="Sprint 12 retrospective"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            aria-label="Board title"
          />
          <button type="submit" disabled={submitting || !title.trim()}>
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>Existing boards</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet — create one above.</p>
        ) : (
          <ul className="board-list">
            {boards.map((b) => (
              <li key={b.id}>
                <button
                  className="link-like"
                  onClick={() => navigate(`/boards/${b.id}`)}
                >
                  {b.title}
                </button>
                <span className="muted small">
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
