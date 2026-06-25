import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const [boards, setBoards] = useState([])
  const [title, setTitle] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/boards')
      .then(res => res.json())
      .then(setBoards)
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
    <div className="home-page">
      <h1>Retrospective Boards</h1>
      <form onSubmit={handleCreate} className="create-form">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="New board title..."
        />
        <button type="submit">Create Board</button>
      </form>
      <div className="board-list">
        {boards.map(board => (
          <div
            key={board.id}
            className="board-card"
            onClick={() => navigate(`/board/${board.id}`)}
          >
            <h3>{board.title}</h3>
            <span className="board-date">{new Date(board.created_at).toLocaleDateString()}</span>
          </div>
        ))}
        {boards.length === 0 && <p className="empty">No boards yet. Create one above!</p>}
      </div>
    </div>
  )
}
