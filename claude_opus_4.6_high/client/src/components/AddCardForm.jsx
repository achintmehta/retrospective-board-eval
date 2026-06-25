import { useState } from 'react'
import './AddCardForm.css'

export default function AddCardForm({ onAdd }) {
  const [content, setContent] = useState('')
  const [active, setActive] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    onAdd(content.trim())
    setContent('')
    setActive(false)
  }

  if (!active) {
    return (
      <button className="add-card-trigger" onClick={() => setActive(true)}>
        + Add a card
      </button>
    )
  }

  return (
    <form className="add-card-form" onSubmit={handleSubmit}>
      <textarea
        placeholder="Enter card text..."
        value={content}
        onChange={e => setContent(e.target.value)}
        autoFocus
        rows={3}
      />
      <div className="add-card-actions">
        <button type="submit" className="add-btn">Add</button>
        <button type="button" className="cancel-btn" onClick={() => { setActive(false); setContent('') }}>Cancel</button>
      </div>
    </form>
  )
}
