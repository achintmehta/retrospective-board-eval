import React, { useState } from 'react';

interface Board {
  id: string;
  title: string;
  createdAt: string;
}

function MainPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchBoards = async () => {
    try {
      const response = await fetch('/api/boards');
      const data = await response.json();
      setBoards(data);
      setError(null);
    } catch (err) {
      setError('Failed to load boards. Make sure the server is running.');
    }
  };

  React.useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newBoardTitle }),
      });
      const data = await response.json();

      if (response.ok) {
        setBoards((prev) => [...prev, data]);
        setNewBoardTitle('');
        setError(null);
      } else {
        setError(data.error || 'Failed to create board');
      }
    } catch (err) {
      setError('Failed to create board. Make sure the server is running.');
    }
  };

  return (
    <div style={styles.container}>
      <h1>Realtime Retro Board</h1>

      {error && <p style={styles.error}>{error}</p>}

      <form onSubmit={handleCreateBoard} style={styles.createForm}>
        <input
          type="text"
          value={newBoardTitle}
          onChange={(e) => setNewBoardTitle(e.target.value)}
          placeholder="Enter board title..."
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          Create Board
        </button>
      </form>

      <div style={styles.boardsList}>
        <h2>Existing Boards</h2>
        {boards.length === 0 ? (
          <p>No boards yet. Create one above!</p>
        ) : (
          <ul style={styles.boardList}>
            {boards.map((board) => (
              <li key={board.id} style={styles.boardItem}>
                <a href={`/board/${board.id}`} style={styles.boardLink}>
                  {board.title}
                </a>
                <span style={styles.date}>
                  {new Date(board.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  createForm: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
  },
  input: {
    flex: 1,
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  boardsList: {},
  boardList: {
    listStyle: 'none',
    padding: 0,
  },
  boardItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },
  boardLink: {
    textDecoration: 'none',
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: '18px',
  },
  date: {
    fontSize: '12px',
    color: '#666',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
};

export default MainPage;
