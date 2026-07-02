import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './HomePage.module.css'

export default function HomePage() {
  const [boards, setBoards] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
      .then(data => { setBoards(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!title.trim()) return
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    })
    if (res.ok) {
      const board = await res.json()
      navigate(`/board/${board.id}`)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoMark} />
        <h1 className={styles.title}>Retro Board</h1>
        <p className={styles.subtitle}>
          Collaborate in real-time. Reflect, improve, repeat.
        </p>
      </header>

      <form className={styles.createForm} onSubmit={handleCreate}>
        <input
          className={styles.input}
          type="text"
          placeholder="Sprint 42 Retrospective..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={100}
        />
        <button className={styles.createBtn} type="submit" disabled={!title.trim()}>
          Create Board
        </button>
      </form>

      <section className={styles.boardList}>
        <h2 className={styles.sectionTitle}>Your Boards</h2>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : boards.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>&#9776;</div>
            <p>No boards yet. Create one to get started.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {boards.map((board, i) => (
              <button
                key={board.id}
                className={styles.boardCard}
                onClick={() => navigate(`/board/${board.id}`)}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className={styles.cardGlow} />
                <h3 className={styles.boardTitle}>{board.title}</h3>
                <span className={styles.boardDate}>
                  {new Date(board.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
