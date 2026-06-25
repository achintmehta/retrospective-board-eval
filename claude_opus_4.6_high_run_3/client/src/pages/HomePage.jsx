import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:3001/api'

function HomePage() {
  const [boards, setBoards] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${API}/boards`)
      .then(r => r.json())
      .then(data => {
        setBoards(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const res = await fetch(`${API}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() })
    })
    const board = await res.json()
    navigate(`/board/${board.id}`)
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Retrospective Board</h1>
        <p style={styles.subtitle}>Create and manage your team retrospectives</p>
      </header>

      <form onSubmit={handleCreate} style={styles.form}>
        <input
          type="text"
          placeholder="Enter board name..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Create Board</button>
      </form>

      <section style={styles.boardList}>
        <h2 style={styles.sectionTitle}>Your Boards</h2>
        {loading && <p style={styles.muted}>Loading...</p>}
        {!loading && boards.length === 0 && (
          <p style={styles.muted}>No boards yet. Create one above!</p>
        )}
        {boards.map(board => (
          <div
            key={board.id}
            style={styles.boardCard}
            onClick={() => navigate(`/board/${board.id}`)}
          >
            <span style={styles.boardTitle}>{board.title}</span>
            <span style={styles.boardDate}>
              {new Date(board.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </section>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: 600,
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
    color: 'var(--text)',
    marginBottom: 8,
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: 16,
  },
  form: {
    display: 'flex',
    gap: 12,
    marginBottom: 40,
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 16,
    outline: 'none',
  },
  button: {
    padding: '12px 24px',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
  },
  boardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 8,
  },
  boardCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'box-shadow 0.2s',
  },
  boardTitle: {
    fontWeight: 600,
    fontSize: 16,
  },
  boardDate: {
    color: 'var(--text-muted)',
    fontSize: 14,
  },
  muted: {
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: 20,
  },
}

export default HomePage
