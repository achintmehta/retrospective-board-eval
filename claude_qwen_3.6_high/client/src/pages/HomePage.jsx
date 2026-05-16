import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '/api';

function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const fetchBoards = () => {
    fetch(`${API}/boards`)
      .then(res => res.json())
      .then(setBoards)
      .catch(err => setError('Failed to connect to server. Make sure the backend is running.'));
  };

  useEffect(() => { fetchBoards(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const res = await fetch(`${API}/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() })
      });
      const board = await res.json();
      setTitle('');
      setError('');
      setBoards(prev => [board, ...prev]);
      window.location.href = `/board/${board.id}`;
    } catch (err) {
      setError('Failed to create board. Check the console for details.');
      console.error(err);
    }
  };

  return (
    <div className="container home">
      <h1>Retro Boards</h1>
      <form className="create-form" onSubmit={handleCreate}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Board title..."
        />
        <button className="btn" type="submit">Create Board</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {boards.length === 0 && !error ? (
        <p className="empty-state">No boards yet. Create one above.</p>
      ) : (
        <div className="board-list">
          {boards.map(b => (
            <Link key={b.id} to={`/board/${b.id}`} className="board-item">
              <strong>{b.title}</strong>
              <br />
              <small>Created {new Date(b.created_at).toLocaleString()}</small>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
