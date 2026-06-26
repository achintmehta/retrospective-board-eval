import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
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

  async function onCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError('');
    try {
      const board = await api.createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  return (
    <div className="home">
      <section className="home-create">
        <h1>Start a retro</h1>
        <p className="muted">
          Create a board for your team. We will pre-fill it with the classic
          retro columns so you can dive in.
        </p>
        <form className="create-form" onSubmit={onCreate}>
          <label htmlFor="board-title" className="sr-only">
            Board title
          </label>
          <input
            id="board-title"
            type="text"
            placeholder="e.g. Sprint 42 retro"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            autoFocus
          />
          <button type="submit" disabled={!title.trim() || creating}>
            {creating ? 'Creating…' : 'Create board'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="home-list">
        <h2>All boards</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <p>No boards yet. Create your first one above.</p>
          </div>
        ) : (
          <ul className="board-list">
            {boards.map((b) => (
              <li key={b.id}>
                <Link to={`/boards/${b.id}`} className="board-card">
                  <span className="board-card-title">{b.title}</span>
                  <span className="board-card-meta">
                    {b.card_count} card{b.card_count === 1 ? '' : 's'} ·{' '}
                    {formatDate(b.created_at)}
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

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch (_e) {
    return iso;
  }
}
