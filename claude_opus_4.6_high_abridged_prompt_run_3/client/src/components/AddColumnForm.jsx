import { useState } from 'react'

export default function AddColumnForm({ boardId, onColumnAdded }) {
  const [title, setTitle] = useState('')
  const [open, setOpen] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const res = await fetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    })
    if (res.ok) {
      setTitle('')
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={styles.triggerBtn}>
        + Column
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Column name"
        autoFocus
        style={styles.input}
      />
      <button type="submit" style={styles.addBtn}>Add</button>
      <button type="button" onClick={() => setOpen(false)} style={styles.cancelBtn}>&#10005;</button>
    </form>
  )
}

const styles = {
  triggerBtn: {
    background: 'linear-gradient(135deg, #222632 0%, #2a2f3e 100%)',
    border: '1px solid #2e3346',
    color: '#9499ad',
    padding: '8px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 200ms',
    whiteSpace: 'nowrap',
  },
  form: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  input: {
    background: '#0f1117',
    border: '1px solid #2e3346',
    borderRadius: '8px',
    color: '#e8eaf0',
    padding: '8px 12px',
    fontSize: '13px',
    width: '140px',
    fontFamily: "'Inter', sans-serif",
  },
  addBtn: {
    background: '#6c63ff',
    color: '#fff',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  cancelBtn: {
    background: 'none',
    color: '#6b7089',
    fontSize: '14px',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
}
