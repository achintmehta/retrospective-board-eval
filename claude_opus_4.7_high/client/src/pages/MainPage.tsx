import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Board } from '../types';

export function MainPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .listBoards()
      .then((bs) => setBoards(bs))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      const board = await api.createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (e) {
      setError(String(e));
      setCreating(false);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Retro Boards</h1>
      </header>

      <section className="card-panel">
        <h2>Create a board</h2>
        <form className="create-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Board title (e.g. Sprint 12 Retro)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={creating}
            autoFocus
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
          <p className="muted">No boards yet. Create your first one above.</p>
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
