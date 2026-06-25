import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MainPage() {
  const [boards, setBoards] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/boards')
      .then((r) => r.json())
      .then((data) => {
        setBoards(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!title.trim()) return
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

  return (
    <div className="main-page">
      <header className="app-header">
        <h1>Retro Board</h1>
        <p>Real-time retrospective boards for your team</p>
      </header>

      <div className="create-board-section">
        <h2>Create a New Board</h2>
        <form onSubmit={handleCreate} className="create-form">
          <input
            type="text"
            placeholder="Board title (e.g. Sprint 42 Retro)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={creating}
          />
          <button type="submit" disabled={creating || !title.trim()}>
            {creating ? 'Creating...' : 'Create Board'}
          </button>
        </form>
      </div>

      <div className="boards-section">
        <h2>Existing Boards</h2>
        {loading ? (
          <p>Loading...</p>
        ) : boards.length === 0 ? (
          <p className="empty-state">No boards yet. Create one above!</p>
        ) : (
          <ul className="board-list">
            {boards.map((board) => (
              <li key={board.id} className="board-item">
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
      </div>
    </div>
  )
}
