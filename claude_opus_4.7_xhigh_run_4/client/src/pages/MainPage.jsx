import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listBoards, createBoard } from '../api.js';

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

export default function MainPage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listBoards()
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    setError('');
    try {
      const board = await createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  return (
    <>
      <header className="app-header">
        <h1>Retro Board</h1>
      </header>
      <main className="main-page">
        <h2>Create a new board</h2>
        <form className="create-board-form" onSubmit={handleSubmit}>
          <input
            className="input"
            value={title}
            maxLength={200}
            placeholder="Sprint 42 Retrospective"
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="submit" className="btn" disabled={creating || !title.trim()}>
            {creating ? 'Creating…' : 'Create board'}
          </button>
        </form>
        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>
        )}

        <h2>Boards</h2>
        {loading ? (
          <p className="loading-state">Loading…</p>
        ) : boards.length === 0 ? (
          <p className="empty-state">No boards yet. Create your first one above.</p>
        ) : (
          <ul className="board-list">
            {boards.map((board) => (
              <li key={board.id} className="board-list-item">
                <Link to={`/boards/${board.id}`}>{board.title}</Link>
                <span className="board-date">{formatDate(board.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
