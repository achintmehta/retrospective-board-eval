import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [boards, setBoards] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
      .then(setBoards);
  }, []);

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    const data = await res.json();
    
    // Create default columns
    const columns = ['Went Well', 'Needs Improvement', 'Action Items'];
    for (let i = 0; i < columns.length; i++) {
      await fetch(`/api/boards/${data.id}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: columns[i], position: i })
      });
    }
    
    navigate(`/boards/${data.id}`);
  };

  return (
    <div className="container">
      <h1>Realtime Retrospective</h1>
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Create New Board</h2>
        <form onSubmit={createBoard} style={{ display: 'flex', gap: '1rem' }}>
          <input 
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Board Title"
            required
            style={{ flex: 1 }}
          />
          <button type="submit">Create Board</button>
        </form>
      </div>

      <h2>Recent Boards</h2>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {boards.map(b => (
          <div key={b.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/boards/${b.id}`)}>
            <h3>{b.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {new Date(b.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
