import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
      .then(data => { setBoards(data); setLoading(false); });
  }, []);

  const createBoard = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    const board = await res.json();
    navigate(`/boards/${board.id}`);
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Retro Boards</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Create and join retrospective boards with your team.</p>

      <form onSubmit={createBoard} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Board name (e.g. Sprint 42 Retro)..."
          style={{
            flex: 1,
            padding: '0.625rem 1rem',
            border: '1.5px solid #d0d0d0',
            borderRadius: 6,
            fontSize: '1rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.625rem 1.5rem',
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          Create Board
        </button>
      </form>

      {loading ? (
        <p style={{ color: '#999' }}>Loading boards...</p>
      ) : boards.length === 0 ? (
        <p style={{ color: '#999' }}>No boards yet. Create one above to get started!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {boards.map(board => (
            <div
              key={board.id}
              onClick={() => navigate(`/boards/${board.id}`)}
              style={{
                background: '#fff',
                border: '1.5px solid #e8e8e8',
                borderRadius: 8,
                padding: '1rem 1.25rem',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#4f46e5'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#e8e8e8'}
            >
              <span style={{ fontSize: '1.05rem', fontWeight: 500 }}>{board.title}</span>
              <span style={{ color: '#aaa', fontSize: '0.825rem' }}>
                {new Date(board.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
