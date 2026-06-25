import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function MainPage() {
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
      .then(data => { setBoards(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!title.trim() || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })
      const board = await res.json()
      navigate(`/board/${board.id}`)
    } catch {
      setCreating(false)
    }
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <main className="main-page">
      <div className="main-hero">
        <h1>Run Better Retrospectives</h1>
        <p>A real-time collaborative board for your team. No sign-up required.</p>
      </div>

      <div className="create-board-card">
        <h2>✨ Create a new board</h2>
        <form className="create-board-form" onSubmit={handleCreate} id="create-board-form">
          <input
            id="board-title-input"
            className="input"
            type="text"
            placeholder="e.g. Sprint 42 Retro, Q2 Team Review…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
            required
            aria-label="Board title"
          />
          <button
            id="create-board-btn"
            type="submit"
            className="btn btn-primary"
            disabled={creating || !title.trim()}
          >
            {creating ? 'Creating…' : 'Create Board'}
          </button>
        </form>
      </div>

      <section className="boards-section">
        <h2>
          <span>📋</span> Your Boards
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            {boards.length > 0 ? `(${boards.length})` : ''}
          </span>
        </h2>

        {loading ? (
          <div className="loading-spinner" aria-label="Loading boards" />
        ) : boards.length === 0 ? (
          <div className="boards-empty">
            <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🗂️</p>
            <p>No boards yet. Create your first one above!</p>
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map(board => (
              <Link key={board.id} to={`/board/${board.id}`} className="board-card" id={`board-${board.id}`}>
                <div className="board-card-title">{board.title}</div>
                <div className="board-card-meta">{formatDate(board.created_at)}</div>
                <span className="board-card-arrow">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
