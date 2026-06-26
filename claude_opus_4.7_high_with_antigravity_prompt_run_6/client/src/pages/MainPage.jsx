import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api
      .listBoards()
      .then((data) => {
        if (!cancelled) setBoards(data);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setCreating(true);
    setError(null);
    try {
      const board = await api.createBoard(t);
      navigate(`/boards/${board.id}`);
    } catch (e) {
      setError(e.message);
      setCreating(false);
    }
  }

  return (
    <section className="main-page">
      <div className="hero">
        <h1>Run your next retrospective in seconds.</h1>
        <p className="hero-sub">
          Spin up a board, share the link, and watch sticky notes appear in
          real time — no signup, no setup, just collaboration.
        </p>
        <form className="create-form" onSubmit={handleCreate}>
          <input
            id="new-board-title"
            type="text"
            placeholder="e.g. Sprint 24 retro"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={creating}
            autoFocus
            maxLength={120}
          />
          <button
            id="create-board-button"
            type="submit"
            disabled={creating || !title.trim()}
          >
            {creating ? 'Creating…' : 'Create board →'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="boards-section">
        <h2>Recent boards</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet — create the first one above.</p>
        ) : (
          <ul className="board-list">
            {boards.map((b) => (
              <li key={b.id} className="board-card">
                <Link to={`/boards/${b.id}`} className="board-card-link">
                  <h3>{b.title}</h3>
                  <div className="board-card-meta">
                    <span>{b.card_count} card{b.card_count === 1 ? '' : 's'}</span>
                    <span>·</span>
                    <span>{formatDate(b.created_at)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function formatDate(iso) {
  try {
    const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
