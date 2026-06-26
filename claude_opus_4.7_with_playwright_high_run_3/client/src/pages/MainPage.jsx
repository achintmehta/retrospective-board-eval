import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.listBoards()
      .then(setBoards)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const board = await api.createBoard(title.trim());
      navigate(`/boards/${board.id}`);
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="main-page">
      <section className="create-board">
        <h2>Create a Retro Board</h2>
        <form onSubmit={handleCreate} className="create-board-form">
          <input
            type="text"
            placeholder="e.g., Sprint 24 Retrospective"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            aria-label="Board title"
          />
          <button type="submit" disabled={!title.trim() || submitting}>
            {submitting ? 'Creating…' : 'Create Board'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="board-list">
        <h2>Boards</h2>
        {loading ? (
          <p>Loading…</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet — create one above.</p>
        ) : (
          <ul>
            {boards.map((b) => (
              <li key={b.id}>
                <Link to={`/boards/${b.id}`}>{b.title}</Link>
                <span className="muted">{new Date(b.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
