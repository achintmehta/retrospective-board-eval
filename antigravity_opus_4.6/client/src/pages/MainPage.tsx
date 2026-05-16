import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchBoards, createBoard } from '../api';
import type { Board } from '../api';

export function MainPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadBoards();
  }, []);

  async function loadBoards() {
    try {
      const data = await fetchBoards();
      setBoards(data);
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBoard(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || creating) return;

    setCreating(true);
    try {
      const board = await createBoard(title.trim());
      navigate(`/board/${board.id}`);
    } catch (err) {
      console.error('Failed to create board:', err);
    } finally {
      setCreating(false);
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span className="loading-text">Loading boards…</span>
      </div>
    );
  }

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <div className="navbar-logo">R</div>
          <span className="navbar-title">RetroBoard</span>
        </Link>
      </nav>

      <main className="main-page page-enter">
        <div className="main-hero">
          <h1>Retrospective Board</h1>
          <p>
            Run real-time retrospectives with your team. Create a board,
            invite your team, and start collaborating — no sign-up required.
          </p>
        </div>

        <section className="create-board-section" id="create-board">
          <div className="create-board-card">
            <h2>Create New Board</h2>
            <form onSubmit={handleCreateBoard} className="input-group">
              <input
                id="board-title-input"
                className="input"
                type="text"
                placeholder="e.g., Sprint 42 Retro"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                autoFocus
              />
              <button
                id="create-board-btn"
                className="btn btn-primary"
                type="submit"
                disabled={!title.trim() || creating}
              >
                {creating ? '…' : '+ Create'}
              </button>
            </form>
          </div>
        </section>

        <section className="boards-section" id="boards-list">
          <h2>Your Boards</h2>
          {boards.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>No boards yet. Create your first retrospective above!</p>
            </div>
          ) : (
            <div className="boards-grid">
              {boards.map((board) => (
                <Link
                  to={`/board/${board.id}`}
                  key={board.id}
                  className="board-card"
                  id={`board-${board.id}`}
                >
                  <h3>{board.title}</h3>
                  <span className="board-date">
                    {formatDate(board.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
