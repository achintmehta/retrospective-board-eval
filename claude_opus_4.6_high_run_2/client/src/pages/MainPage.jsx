import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './MainPage.css'

const API = '/api'

function MainPage() {
  const [boards, setBoards] = useState([])
  const [title, setTitle] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${API}/boards`)
      .then(res => res.json())
      .then(setBoards)
      .catch(console.error)
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
    <div className="main-page">
      <header className="main-header">
        <h1>Retrospective Boards</h1>
      </header>

      <form className="create-board-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New board title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit">Create Board</button>
      </form>

      <div className="boards-list">
        {boards.length === 0 && (
          <p className="empty-state">No boards yet. Create one to get started!</p>
        )}
        {boards.map(board => (
          <div
            key={board.id}
            className="board-card"
            onClick={() => navigate(`/board/${board.id}`)}
          >
            <h3>{board.title}</h3>
            <span className="board-date">
              {new Date(board.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MainPage
