import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
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
    <>
      <header className="app-header">
        <h1>Retrospective Board</h1>
      </header>
      <div className="main-page">
        <h2>Boards</h2>
        <form className="create-board-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="New board title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="submit">Create Board</button>
        </form>
        {boards.length === 0 ? (
          <div className="empty-state">No boards yet. Create one above!</div>
        ) : (
          <ul className="boards-list">
            {boards.map((board) => (
              <li key={board.id}>
                <Link to={`/board/${board.id}`}>
                  <div>{board.title}</div>
                  <div className="board-date">
                    Created {new Date(board.created_at).toLocaleDateString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
