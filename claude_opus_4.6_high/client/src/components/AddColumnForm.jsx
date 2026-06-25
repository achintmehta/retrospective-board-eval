import { useState } from 'react'
import './AddColumnForm.css'

export default function AddColumnForm({ onAdd }) {
  const [title, setTitle] = useState('')
  const [active, setActive] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onAdd(title.trim())
    setTitle('')
    setActive(false)
  }

  if (!active) {
    return (
      <button className="add-column-trigger" onClick={() => setActive(true)}>
        + Add column
      </button>
    )
  }

  return (
    <div className="add-column-form-wrapper">
      <form className="add-column-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Column title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />
        <div className="add-column-actions">
          <button type="submit" className="add-btn">Add</button>
          <button type="button" className="cancel-btn" onClick={() => { setActive(false); setTitle('') }}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
