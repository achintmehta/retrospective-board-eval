import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function MainPage() {
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
      body: JSON.stringify({ title: title.trim() })
    })
    const board = await res.json()
    setTitle('')
    navigate(`/board/${board.id}`)
  }

  return (
    <div className="main-page">
      <h1>Retrospective Boards</h1>
      <form className="create-board-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New board title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <button type="submit">Create Board</button>
      </form>
      <ul className="board-list">
        {boards.map(board => (
          <li key={board.id}>
            <Link to={`/board/${board.id}`}>
              <span className="board-title">{board.title}</span>
              <span className="board-date">
                {new Date(board.created_at).toLocaleDateString()}
              </span>
            </Link>
          </li>
        ))}
        {boards.length === 0 && (
          <li style={{ color: '#888', padding: 16 }}>
            No boards yet. Create one above!
          </li>
        )}
      </ul>
    </div>
  )
}
