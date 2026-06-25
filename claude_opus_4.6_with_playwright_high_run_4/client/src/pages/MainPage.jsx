import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const styles = {
  container: { maxWidth: 800, margin: '0 auto', padding: 32 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, marginBottom: 8 },
  form: { display: 'flex', gap: 8, marginBottom: 32 },
  input: { flex: 1 },
  list: { listStyle: 'none' },
  listItem: {
    padding: 16,
    background: 'white',
    borderRadius: 8,
    marginBottom: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  boardTitle: { fontSize: 18, fontWeight: 500 },
  date: { color: '#888', fontSize: 13 },
}

export default function MainPage() {
  const [boards, setBoards] = useState([])
  const [title, setTitle] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/boards')
      .then((r) => r.json())
      .then(setBoards)
  }, [])

  const createBoard = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    })
    const board = await res.json()
    navigate(`/boards/${board.id}`)
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Retrospective Boards</h1>
        <p>Create and manage your team retrospectives</p>
      </div>

      <form onSubmit={createBoard} style={styles.form}>
        <input
          style={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter board title..."
        />
        <button type="submit">Create Board</button>
      </form>

      <ul style={styles.list}>
        {boards.map((board) => (
          <li key={board.id} style={styles.listItem}>
            <a href={`/boards/${board.id}`} onClick={(e) => { e.preventDefault(); navigate(`/boards/${board.id}`) }}>
              <span style={styles.boardTitle}>{board.title}</span>
            </a>
            <span style={styles.date}>{new Date(board.created_at).toLocaleDateString()}</span>
          </li>
        ))}
        {boards.length === 0 && (
          <li style={{ ...styles.listItem, justifyContent: 'center', color: '#888' }}>
            No boards yet. Create one above!
          </li>
        )}
      </ul>
    </div>
  )
}
