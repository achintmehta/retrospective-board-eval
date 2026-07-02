import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './HomePage.css'

function HomePage() {
  const [boards, setBoards] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/boards')
      .then((r) => r.json())
      .then((data) => {
        setBoards(data)
        setLoading(false)
      })
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
    <div className="home">
      <header className="home-header">
        <div className="logo-mark">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="url(#g1)" />
            <rect x="6" y="8" width="5" height="16" rx="2" fill="rgba(255,255,255,0.9)" />
            <rect x="13.5" y="6" width="5" height="20" rx="2" fill="rgba(255,255,255,0.7)" />
            <rect x="21" y="10" width="5" height="12" rx="2" fill="rgba(255,255,255,0.5)" />
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="32" y2="32">
                <stop stopColor="#6c63ff" />
                <stop offset="1" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1>RetroBoard</h1>
        <p className="subtitle">Real-time retrospective collaboration for your team</p>
      </header>

      <section className="create-section">
        <form onSubmit={handleCreate} className="create-form">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sprint 42 Retrospective..."
            className="create-input"
            maxLength={120}
          />
          <button type="submit" className="btn-primary" disabled={!title.trim()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Create Board
          </button>
        </form>
      </section>

      <section className="boards-section">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Loading boards...</span>
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="8" width="40" height="32" rx="4" stroke="var(--text-muted)" strokeWidth="2" fill="none" />
              <path d="M4 16h40" stroke="var(--text-muted)" strokeWidth="2" />
              <rect x="10" y="22" width="12" height="4" rx="1" fill="var(--text-muted)" opacity="0.4" />
              <rect x="10" y="30" width="8" height="4" rx="1" fill="var(--text-muted)" opacity="0.3" />
            </svg>
            <p>No boards yet. Create your first retrospective above!</p>
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map((board) => (
              <button
                key={board.id}
                className="board-card"
                onClick={() => navigate(`/board/${board.id}`)}
              >
                <div className="board-card-accent" />
                <h3>{board.title}</h3>
                <span className="board-date">
                  {new Date(board.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <svg className="board-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default HomePage
