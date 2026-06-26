import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface Board {
  id: string;
  title: string;
  created_at: string;
}

export function HomePage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then(res => res.json())
      .then(data => { setBoards(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() })
    });
    const board = await res.json();
    navigate(`/board/${board.id}`);
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>RetroBoard</h1>
        <div className="subtitle">Real-time collaborative retrospectives</div>
      </header>
      <div className="page-content">
        <div className="home-container">
          <form className="create-board-form" onSubmit={createBoard}>
            <input
              id="board-title-input"
              type="text"
              placeholder="Enter a name for your retro board..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
            <button id="create-board-btn" type="submit" className="btn-primary">
              Create Board
            </button>
          </form>

          {loading ? (
            <div className="loading">
              <div className="spinner" />
              Loading boards...
            </div>
          ) : boards.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <p>No boards yet. Create your first retrospective board above!</p>
            </div>
          ) : (
            <div className="boards-grid">
              {boards.map(board => (
                <Link key={board.id} to={`/board/${board.id}`} className="board-card-link" id={`board-${board.id}`}>
                  <h3>{board.title}</h3>
                  <div className="date">
                    Created {new Date(board.created_at + 'Z').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
