import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type BoardSummary } from '../api';

function formatDate(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function HomePage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .listBoards()
      .then((b) => {
        if (alive) setBoards(b);
      })
      .catch((err) => {
        if (alive) setError(err.message ?? 'Failed to load boards');
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setCreating(true);
    setError(null);
    try {
      const board = await api.createBoard(value);
      setTitle('');
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError((err as Error).message);
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="hero">
        <span className="hero-eyebrow">Real-time · Self-hosted</span>
        <h1 className="hero-title">
          Retrospectives that <span className="hero-title-grad">flow.</span>
        </h1>
        <p className="hero-sub">
          Spin up a board, invite your team by link, drag cards, drop insights.
          Nothing to install. Nothing to configure.
        </p>
      </div>

      <form className="panel create-board" onSubmit={handleCreate}>
        <div className="field">
          <label className="field-label" htmlFor="board-title">
            New board
          </label>
          <input
            id="board-title"
            className="input"
            placeholder="Sprint 42 retrospective..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            disabled={creating}
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!title.trim() || creating}
        >
          {creating ? 'Creating…' : 'Create board →'}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      <h2 className="section-title">
        Recent boards
        {boards && (
          <span className="section-title-count">{boards.length}</span>
        )}
      </h2>

      {boards === null && <div className="spinner" />}

      {boards && boards.length === 0 && (
        <div className="empty-state">
          <h2>No boards yet</h2>
          <p>Create your first retrospective board above to get started.</p>
        </div>
      )}

      {boards && boards.length > 0 && (
        <div className="board-grid">
          {boards.map((board) => (
            <a
              key={board.id}
              className="board-card"
              href={`/boards/${board.id}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/boards/${board.id}`);
              }}
            >
              <h3 className="board-card-title">{board.title}</h3>
              <div className="board-card-meta">
                <span>{formatDate(board.created_at)}</span>
                <span className="board-card-badge">
                  {board.card_count} card{board.card_count === 1 ? '' : 's'}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
