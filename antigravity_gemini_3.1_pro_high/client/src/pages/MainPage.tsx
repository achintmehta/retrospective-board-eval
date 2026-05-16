import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function MainPage() {
  const [boards, setBoards] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
      .then(data => setBoards(data));
  }, []);

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    const board = await res.json();
    
    // Create default columns
    const columns = ['Went Well', 'Needs Improvement', 'Action Items'];
    for (let i = 0; i < columns.length; i++) {
      await fetch(`/api/boards/${board.id}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: columns[i], position: i })
      });
    }

    navigate(`/board/${board.id}`);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Retrospective Boards</h1>
      <form onSubmit={createBoard} style={{ marginBottom: '2rem' }}>
        <input 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          placeholder="New Board Title" 
          style={{ padding: '0.5rem', marginRight: '0.5rem' }}
        />
        <button type="submit" style={{ padding: '0.5rem' }}>Create Board</button>
      </form>
      <div>
        <h2>Recent Boards</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {boards.map(b => (
            <li key={b.id} style={{ marginBottom: '1rem' }}>
              <Link to={`/board/${b.id}`} style={{ textDecoration: 'none', color: 'blue', fontSize: '1.2rem' }}>
                {b.title}
              </Link>
              <span style={{ marginLeft: '1rem', color: 'gray', fontSize: '0.9rem' }}>
                {new Date(b.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
