import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './MainPage.css';

function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then((res) => res.json())
      .then((data) => {
        setBoards(data);
        setLoading(false);
      });
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    });
    const board = await res.json();
    navigate(`/boards/${board.id}`);
  }

  return (
    <div className="main-page">
      <div className="main-content">
        <h2>Your Retrospective Boards</h2>

        <form className="create-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="New board title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="submit">Create Board</button>
        </form>

        {loading ? (
          <p className="loading-text">Loading boards...</p>
        ) : boards.length === 0 ? (
          <p className="empty-text">No boards yet. Create your first one above!</p>
        ) : (
          <ul className="board-list">
            {boards.map((board) => (
              <li key={board.id}>
                <Link to={`/boards/${board.id}`} className="board-link">
                  <span className="board-title">{board.title}</span>
                  <span className="board-date">
                    {new Date(board.created_at).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default MainPage;
