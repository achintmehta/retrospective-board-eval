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
      .then(setBoards)
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    })
    const board = await res.json()
    setCreating(false)
    navigate(`/board/${board.id}`)
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Retrospective Boards</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
        Create or join a board to run a real-time retrospective.
      </p>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
        <input
          type="text"
          placeholder="New board name..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          disabled={creating || !title.trim()}
          style={{ background: 'var(--primary)', color: '#fff', whiteSpace: 'nowrap' }}
        >
          {creating ? 'Creating…' : 'Create Board'}
        </button>
      </form>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading boards…</p>
      ) : boards.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No boards yet. Create one above!</p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {boards.map((board) => (
            <li
              key={board.id}
              onClick={() => navigate(`/board/${board.id}`)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '16px 20px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow)',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow)')}
            >
              <div style={{ fontWeight: 600, fontSize: 16 }}>{board.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                Created {new Date(board.created_at).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
