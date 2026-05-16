import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then(res => res.json())
      .then(data => { setBoards(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const createBoard = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    });
    if (res.ok) {
      const board = await res.json();
      navigate(`/board/${board.id}`);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="home-container">
      <div className="home-hero">
        <h1>Retrospective Board</h1>
        <p>Create a board, invite your team, and collaborate in real-time to reflect and improve.</p>
      </div>

      <form className="create-board-form" onSubmit={createBoard}>
        <input
          className="input-field"
          type="text"
          placeholder="Enter board title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />
        <button type="submit" className="btn-primary">Create Board</button>
      </form>

      {loading ? (
        <div className="loading">
          <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
        </div>
      ) : boards.length === 0 ? (
        <div className="empty-state animate-fade-in">
          <div className="empty-state-icon">&#9744;</div>
          <h3>No boards yet</h3>
          <p>Create your first retrospective board to get started.</p>
        </div>
      ) : (
        <div className="boards-grid">
          {boards.map((board, i) => (
            <div
              key={board.id}
              className="glass-panel board-card"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => navigate(`/board/${board.id}`)}
            >
              <h3>{board.title}</h3>
              <span className="board-date">{formatDate(board.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
