import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then((r) => r.json())
      .then((data) => { setBoards(data); setLoading(false); });
  }, []);

  const createBoard = async (e) => {
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
    <div className="container">
      <h1>Retro Board</h1>
      <form onSubmit={createBoard} className="create-form">
        <input
          type="text"
          placeholder="New board name..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit">Create Board</button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : boards.length === 0 ? (
        <p style={{ color: '#888' }}>No boards yet. Create your first one above!</p>
      ) : (
        <ul className="board-list">
          {boards.map((b) => (
            <li key={b.id} onClick={() => navigate(`/board/${b.id}`)}>
              <span>{b.title}</span>
              <small>{new Date(b.created_at).toLocaleDateString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
