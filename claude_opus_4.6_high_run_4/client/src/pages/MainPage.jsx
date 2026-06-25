import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

function MainPage() {
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
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Retrospective Boards</h1>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        <input
          type="text"
          placeholder="New board title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          style={{ background: '#4361ee', color: '#fff', fontWeight: 600 }}
        >
          Create Board
        </button>
      </form>

      {boards.length === 0 ? (
        <p style={{ color: '#888' }}>No boards yet. Create one to get started!</p>
      ) : (
        <ul style={{ listStyle: 'none' }}>
          {boards.map(board => (
            <li key={board.id} style={{
              background: '#fff',
              borderRadius: 8,
              padding: '16px 20px',
              marginBottom: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <Link to={`/board/${board.id}`} style={{ fontWeight: 500, fontSize: 16 }}>
                {board.title}
              </Link>
              <span style={{ color: '#888', fontSize: 13 }}>
                {new Date(board.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default MainPage
