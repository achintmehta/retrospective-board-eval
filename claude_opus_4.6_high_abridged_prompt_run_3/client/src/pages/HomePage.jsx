import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function HomePage() {
  const [boards, setBoards] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
      .then(data => { setBoards(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
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
      <header style={styles.header}>
        <div style={styles.logoGlow} />
        <h1 style={styles.title}>
          <span style={styles.titleIcon}>&#9670;</span> RetroBoard
        </h1>
        <p style={styles.subtitle}>Real-time retrospective collaboration</p>
      </header>

      <main style={styles.main}>
        <form onSubmit={handleCreate} style={styles.form}>
          <h2 style={styles.formTitle}>Create a New Board</h2>
          <div style={styles.inputRow}>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter board title..."
              style={styles.input}
            />
            <button type="submit" style={styles.createBtn}>
              Create
              <span style={styles.btnArrow}>&#8594;</span>
            </button>
          </div>
        </form>

        <section style={styles.boardsSection}>
          <h2 style={styles.sectionTitle}>Your Boards</h2>
          {loading ? (
            <div style={styles.emptyState}>
              <div style={styles.spinner} />
            </div>
          ) : boards.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>&#9881;</span>
              <p style={styles.emptyText}>No boards yet. Create one above to get started.</p>
            </div>
          ) : (
            <div style={styles.boardGrid}>
              {boards.map((board, i) => (
                <Link key={board.id} to={`/board/${board.id}`} style={{ ...styles.boardCard, animationDelay: `${i * 60}ms` }}>
                  <div style={styles.cardAccent} />
                  <h3 style={styles.boardName}>{board.title}</h3>
                  <span style={styles.boardDate}>
                    {new Date(board.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span style={styles.cardArrow}>&#8594;</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

const fadeIn = {
  animation: 'fadeSlideIn 400ms ease-out both',
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'linear-gradient(170deg, #0f1117 0%, #161926 50%, #0f1117 100%)',
  },
  header: {
    textAlign: 'center',
    padding: '80px 24px 40px',
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    top: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '200px',
    height: '200px',
    background: 'radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  title: {
    fontSize: '48px',
    fontWeight: 700,
    color: '#e8eaf0',
    letterSpacing: '-1.5px',
    margin: 0,
    position: 'relative',
  },
  titleIcon: {
    color: '#6c63ff',
    marginRight: '8px',
    fontSize: '36px',
  },
  subtitle: {
    color: '#9499ad',
    fontSize: '16px',
    marginTop: '8px',
    fontWeight: 400,
  },
  main: {
    width: '100%',
    maxWidth: '720px',
    padding: '0 24px 80px',
  },
  form: {
    background: 'linear-gradient(135deg, #1a1d27 0%, #1e2230 100%)',
    border: '1px solid #2e3346',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '48px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  formTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e8eaf0',
    marginBottom: '16px',
  },
  inputRow: {
    display: 'flex',
    gap: '12px',
  },
  input: {
    flex: 1,
    background: '#181b24',
    border: '1px solid #2e3346',
    borderRadius: '10px',
    color: '#e8eaf0',
    padding: '12px 16px',
    fontSize: '15px',
    transition: 'border-color 200ms, box-shadow 200ms',
  },
  createBtn: {
    background: 'linear-gradient(135deg, #6c63ff 0%, #5a52e0 100%)',
    color: '#fff',
    padding: '12px 28px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(108,99,255,0.3)',
    transition: 'transform 150ms, box-shadow 150ms',
  },
  btnArrow: {
    fontSize: '18px',
    transition: 'transform 200ms',
  },
  boardsSection: {
    marginTop: '8px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#e8eaf0',
    marginBottom: '20px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    background: '#1a1d27',
    borderRadius: '16px',
    border: '1px dashed #2e3346',
  },
  emptyIcon: {
    fontSize: '36px',
    color: '#6b7089',
    display: 'block',
    marginBottom: '12px',
  },
  emptyText: {
    color: '#9499ad',
    fontSize: '15px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #2e3346',
    borderTop: '3px solid #6c63ff',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'spin 0.8s linear infinite',
  },
  boardGrid: {
    display: 'grid',
    gap: '12px',
  },
  boardCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: 'linear-gradient(135deg, #1e2230 0%, #222632 100%)',
    border: '1px solid #2e3346',
    borderRadius: '12px',
    padding: '20px 24px',
    textDecoration: 'none',
    color: 'inherit',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 150ms, border-color 200ms, box-shadow 200ms',
  },
  cardAccent: {
    width: '4px',
    height: '32px',
    background: 'linear-gradient(180deg, #6c63ff, #34d399)',
    borderRadius: '2px',
    flexShrink: 0,
  },
  boardName: {
    flex: 1,
    fontSize: '16px',
    fontWeight: 600,
    color: '#e8eaf0',
  },
  boardDate: {
    fontSize: '13px',
    color: '#6b7089',
    flexShrink: 0,
  },
  cardArrow: {
    fontSize: '18px',
    color: '#6b7089',
    transition: 'transform 200ms, color 200ms',
    flexShrink: 0,
  },
}
