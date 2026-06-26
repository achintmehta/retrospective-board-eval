import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

interface Board {
  id: string;
  title: string;
  created_at: string;
}

export default function MainPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then(res => res.json())
      .then(data => {
        setBoards(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    });
    const board = await res.json();
    navigate(`/board/${board.id}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Retro Board</h1>
      </header>

      <main className="main-content">
        <div className="hero">
          <h2>Your Retrospectives</h2>
          <p>Create and collaborate on team retrospectives in real-time</p>
        </div>

        <form className="create-form" onSubmit={handleCreate}>
          <input
            className="input"
            type="text"
            placeholder="Enter board title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            id="board-title-input"
          />
          <button className="btn btn-primary" type="submit" id="create-board-btn">
            + Create
          </button>
        </form>

        {loading ? (
          <div className="loading" style={{ minHeight: '200px' }}>
            <div className="spinner" />
            Loading boards...
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>No boards yet</p>
            <p>Create your first retrospective board to get started</p>
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map(board => (
              <div
                key={board.id}
                className="board-card"
                onClick={() => navigate(`/board/${board.id}`)}
                id={`board-${board.id}`}
              >
                <h3>{board.title}</h3>
                <span className="date">{formatDate(board.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
