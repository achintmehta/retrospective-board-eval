import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Board } from '../types';

export default function MainPage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create board form state
  const [boardTitle, setBoardTitle] = useState('');
  const [columnInput, setColumnInput] = useState('');
  const [columns, setColumns] = useState<string[]>(['Went Well', 'Needs Improvement', 'Action Items']);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    document.title = 'Retro Board — Dashboard';
    fetchBoards();
  }, []);

  async function fetchBoards() {
    try {
      const res = await fetch('/api/boards');
      if (!res.ok) throw new Error('Failed to fetch boards');
      const data = await res.json();
      setBoards(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function addColumn() {
    const trimmed = columnInput.trim();
    if (trimmed && !columns.includes(trimmed)) {
      setColumns([...columns, trimmed]);
    }
    setColumnInput('');
  }

  function removeColumn(col: string) {
    setColumns(columns.filter(c => c !== col));
  }

  async function handleCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    const title = boardTitle.trim();
    if (!title) return;

    setCreating(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, columns }),
      });
      if (!res.ok) throw new Error('Failed to create board');
      const board = await res.json();
      navigate(`/board/${board.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setCreating(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  return (
    <>
      <header className="app-header">
        <Link to="/" className="logo">
          <span className="logo-icon">🔁</span>
          RetroBoard
        </Link>
      </header>

      <main className="app-main">
        <div className="main-page">
          <div className="page-hero">
            <h1>Retrospective Boards</h1>
            <p>Run collaborative retros with your team — real-time, no signup required.</p>
          </div>

          {error && <div className="error-banner" role="alert">{error}</div>}

          {/* Board List */}
          <section className="boards-section" aria-label="Your boards">
            <h2>Your Boards</h2>
            {loading ? (
              <div className="loading-spinner"><div className="spinner" /></div>
            ) : boards.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <p style={{ fontWeight: 600 }}>No boards yet</p>
                <p>Create your first retrospective board below.</p>
              </div>
            ) : (
              <div className="boards-grid">
                {boards.map(board => (
                  <Link
                    key={board.id}
                    to={`/board/${board.id}`}
                    className="board-card"
                    id={`board-card-${board.id}`}
                  >
                    <div className="board-card-title">{board.title}</div>
                    <div className="board-card-meta">Created {formatDate(board.created_at)}</div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Create Board */}
          <section className="create-board-section" aria-label="Create a new board">
            <h2>Create a New Board</h2>
            <form className="create-board-form" onSubmit={handleCreateBoard} id="create-board-form">
              <div>
                <label htmlFor="board-title" className="text-sm text-muted" style={{ display: 'block', marginBottom: 6 }}>
                  Board Name
                </label>
                <input
                  id="board-title"
                  className="input"
                  type="text"
                  placeholder="e.g., Sprint 42 Retrospective"
                  value={boardTitle}
                  onChange={e => setBoardTitle(e.target.value)}
                  required
                  maxLength={100}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-muted" style={{ display: 'block', marginBottom: 6 }}>
                  Columns
                </label>
                <div className="form-row">
                  <input
                    id="column-input"
                    className="input"
                    type="text"
                    placeholder="Add column..."
                    value={columnInput}
                    onChange={e => setColumnInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addColumn(); }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addColumn}
                    disabled={!columnInput.trim()}
                    id="add-column-btn"
                  >
                    Add
                  </button>
                </div>
                <div className="column-tags">
                  {columns.map(col => (
                    <span key={col} className="column-tag">
                      {col}
                      <button
                        type="button"
                        className="column-tag-remove"
                        onClick={() => removeColumn(col)}
                        aria-label={`Remove column ${col}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || !boardTitle.trim() || columns.length === 0}
                  id="create-board-submit"
                >
                  {creating ? 'Creating…' : '✨ Create Board'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
