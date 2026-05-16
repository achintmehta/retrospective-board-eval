import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function MainPage() {
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
      body: JSON.stringify({ title: title.trim() })
    });
    const board = await res.json();
    navigate(`/board/${board.id}`);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1>Retrospective Boards</h1>

      <form onSubmit={handleCreate} style={{ marginBottom: 30 }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New board title..."
          style={{ padding: 8, marginRight: 8, width: 300 }}
        />
        <button type="submit" style={{ padding: 8 }}>Create Board</button>
      </form>

      {boards.length === 0 ? (
        <p>No boards yet. Create one above!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {boards.map(board => (
            <li key={board.id} style={{ marginBottom: 10 }}>
              <a
                href={`/board/${board.id}`}
                onClick={(e) => { e.preventDefault(); navigate(`/board/${board.id}`); }}
                style={{ fontSize: 18 }}
              >
                {board.title}
              </a>
              <span style={{ marginLeft: 10, color: '#888', fontSize: 12 }}>
                {new Date(board.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MainPage;
