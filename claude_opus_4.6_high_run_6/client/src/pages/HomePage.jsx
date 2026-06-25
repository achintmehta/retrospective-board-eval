import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function HomePage() {
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
    navigate(`/board/${board.id}`)
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ marginBottom: 24, color: '#1a1a2e' }}>Retrospective Boards</h1>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="New board title..."
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          style={{ background: '#4a90d9', color: '#fff', whiteSpace: 'nowrap' }}
        >
          Create Board
        </button>
      </form>

      {boards.length === 0 && (
        <p style={{ color: '#888', textAlign: 'center' }}>No boards yet. Create one above!</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {boards.map(board => (
          <div
            key={board.id}
            onClick={() => navigate(`/board/${board.id}`)}
            style={{
              background: '#fff',
              padding: '16px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ fontWeight: 500 }}>{board.title}</span>
            <span style={{ color: '#888', fontSize: 13 }}>
              {new Date(board.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HomePage
