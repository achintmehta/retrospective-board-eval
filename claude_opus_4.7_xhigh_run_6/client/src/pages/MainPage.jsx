import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api
      .listBoards()
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

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const board = await api.createBoard(trimmed);
      setTitle('');
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="main-page">
      <section className="card-panel">
        <h1>Retrospective Boards</h1>
        <form className="create-board-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="New board title (e.g., Sprint 42 Retro)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            disabled={submitting}
            aria-label="New board title"
          />
          <button type="submit" disabled={submitting || !title.trim()}>
            {submitting ? 'Creating…' : 'Create Board'}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </section>

      <section className="card-panel">
        <h2>Existing Boards</h2>
        {loading ? (
          <p>Loading boards…</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet. Create one above to get started.</p>
        ) : (
          <ul className="board-list">
            {boards.map((board) => (
              <li key={board.id}>
                <Link to={`/boards/${board.id}`} className="board-link">
                  <span className="board-link-title">{board.title}</span>
                  <span className="board-link-date">
                    {new Date(board.created_at).toLocaleString()}
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
