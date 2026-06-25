import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function App() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then(res => res.json())
      .then(setBoards);
  }, []);

  const handleCreate = async (e) => {
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

  return (
    <div className="home">
      <header className="home-header">
        <h1>Retro Board</h1>
        <p>Create and manage your team retrospectives</p>
      </header>

      <form className="create-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Enter board name..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit">Create Board</button>
      </form>

      <div className="boards-list">
        {boards.length === 0 && (
          <p className="empty-state">No boards yet. Create one above!</p>
        )}
        {boards.map((board) => (
          <div
            key={board.id}
            className="board-card"
            onClick={() => navigate(`/board/${board.id}`)}
          >
            <h3>{board.title}</h3>
            <span className="board-date">
              {new Date(board.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
