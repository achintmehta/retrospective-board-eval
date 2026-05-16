import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createBoard, fetchBoards } from '../api';
import type { Board } from '../types';

export default function MainPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    fetchBoards()
      .then((list) => {
        if (active) setBoards(list);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const board = await createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="main-page">
      <section className="card-panel">
        <h1>Create a new retrospective</h1>
        <form className="create-form" onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="Board title (e.g. Sprint 24 Retro)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            disabled={submitting}
            aria-label="Board title"
          />
          <button type="submit" disabled={submitting || !title.trim()}>
            {submitting ? 'Creating…' : 'Create board'}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </section>

      <section className="card-panel">
        <h2>Existing boards</h2>
        {loading ? (
          <p>Loading…</p>
        ) : boards.length === 0 ? (
          <p className="muted">No boards yet — create your first one above.</p>
        ) : (
          <ul className="board-list">
            {boards.map((board) => (
              <li key={board.id}>
                <Link to={`/boards/${board.id}`}>{board.title}</Link>
                <span className="muted">
                  {new Date(board.created_at + 'Z').toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
