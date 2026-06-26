import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createBoardApi, fetchBoards } from '../api.js';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetchBoards()
      .then((data) => { if (!cancelled) setBoards(data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const board = await createBoardApi(title.trim());
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="main-page">
      <section className="panel">
        <h2>Create a new board</h2>
        <form onSubmit={submit} className="board-create-form">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sprint 42 Retrospective"
            disabled={submitting}
            maxLength={120}
            aria-label="Board title"
          />
          <button type="submit" disabled={submitting || !title.trim()}>
            {submitting ? 'Creating…' : 'Create Board'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <h2>Existing boards</h2>
        {loading ? (
          <p>Loading…</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet. Create one above.</p>
        ) : (
          <ul className="board-list">
            {boards.map((b) => (
              <li key={b.id}>
                <Link to={`/boards/${b.id}`}>{b.title}</Link>
                <span className="muted">{new Date(b.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
