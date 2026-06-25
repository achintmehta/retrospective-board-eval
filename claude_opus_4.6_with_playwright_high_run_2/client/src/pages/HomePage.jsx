import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const styles = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    fontSize: 16,
  },
  form: {
    display: 'flex',
    gap: 12,
    marginBottom: 32,
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 16,
    outline: 'none',
  },
  createBtn: {
    padding: '12px 24px',
    background: '#646cff',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
  },
  boardList: {
    listStyle: 'none',
  },
  boardItem: {
    padding: '16px 20px',
    background: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
  },
  boardTitle: {
    fontWeight: 600,
    color: '#1a1a2e',
  },
  boardDate: {
    color: '#999',
    fontSize: 14,
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: 40,
  },
}

export default function HomePage() {
  const [boards, setBoards] = useState([])
  const [title, setTitle] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/boards')
      .then(res => res.json())
      .then(setBoards)
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!title.trim()) return
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    })
    const board = await res.json()
    navigate(`/board/${board.id}`)
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Retrospective Board</h1>
        <p style={styles.subtitle}>Create and collaborate on team retrospectives in real-time</p>
      </div>

      <form onSubmit={handleCreate} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="Enter board title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <button type="submit" style={styles.createBtn}>Create Board</button>
      </form>

      {boards.length === 0 ? (
        <p style={styles.empty}>No boards yet. Create one to get started!</p>
      ) : (
        <ul style={styles.boardList}>
          {boards.map(board => (
            <li
              key={board.id}
              style={styles.boardItem}
              onClick={() => navigate(`/board/${board.id}`)}
            >
              <span style={styles.boardTitle}>{board.title}</span>
              <span style={styles.boardDate}>
                {new Date(board.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
