import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './MainPage.css'

export default function MainPage() {
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
    navigate(`/boards/${board.id}`)
  }

  return (
    <div className="main-page">
      <header className="app-header">
        <h1>Retro Board</h1>
      </header>
      <div className="main-content">
        <form className="create-board-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="New board title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <button type="submit">Create Board</button>
        </form>

        <div className="boards-list">
          <h2>Your Boards</h2>
          {boards.length === 0 && <p className="empty">No boards yet. Create one above!</p>}
          {boards.map(board => (
            <div
              key={board.id}
              className="board-card"
              onClick={() => navigate(`/boards/${board.id}`)}
            >
              <h3>{board.title}</h3>
              <span className="board-date">{new Date(board.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
