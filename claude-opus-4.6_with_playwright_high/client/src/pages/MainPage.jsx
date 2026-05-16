import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then(res => res.json())
      .then(setBoards);
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
    navigate(`/board/${board.id}`);
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Retrospective Boards</h1>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="New board title..."
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          style={{
            background: 'var(--primary)',
            color: '#fff',
          }}
        >
          Create Board
        </button>
      </form>

      {boards.length === 0 && (
        <p style={{ color: 'var(--text-secondary)' }}>No boards yet. Create one to get started.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {boards.map(board => (
          <div
            key={board.id}
            onClick={() => navigate(`/board/${board.id}`)}
            style={{
              background: 'var(--surface)',
              padding: '16px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              border: '1px solid var(--border)',
              textAlign: 'left',
              transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{board.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {new Date(board.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
