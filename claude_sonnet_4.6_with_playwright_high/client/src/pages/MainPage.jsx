import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || ''

export default function MainPage() {
  const [boards, setBoards] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${API}/api/boards`)
      .then((r) => r.json())
      .then(setBoards)
      .catch(() => setError('Failed to load boards'))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })
      const board = await res.json()
      navigate(`/board/${board.id}`)
    } catch {
      setError('Failed to create board')
      setLoading(false)
    }
  }

  return (
    <div className="main-page">
      <header className="app-header">
        <h1>Retro Board</h1>
        <p>Run better retrospectives with your team</p>
      </header>

      <main className="main-content">
        <section className="create-section">
          <h2>Create a New Board</h2>
          <form onSubmit={handleCreate} className="create-form">
            <input
              type="text"
              placeholder="Board title (e.g. Sprint 42 Retro)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              maxLength={100}
            />
            <button type="submit" disabled={loading || !title.trim()}>
              {loading ? 'Creating…' : 'Create Board'}
            </button>
          </form>
          {error && <p className="error">{error}</p>}
        </section>

        <section className="boards-section">
          <h2>Your Boards</h2>
          {boards.length === 0 ? (
            <p className="empty">No boards yet. Create one above!</p>
          ) : (
            <ul className="boards-list">
              {boards.map((board) => (
                <li key={board.id}>
                  <button
                    className="board-link"
                    onClick={() => navigate(`/board/${board.id}`)}
                  >
                    <span className="board-title">{board.title}</span>
                    <span className="board-date">
                      {new Date(board.created_at).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
