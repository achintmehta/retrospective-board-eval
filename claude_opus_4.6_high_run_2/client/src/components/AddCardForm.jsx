import { useState } from 'react'
import './AddCardForm.css'

function AddCardForm({ onAdd }) {
  const [content, setContent] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (content.trim()) {
      onAdd(content.trim())
      setContent('')
      setIsOpen(false)
    }
  }

  if (!isOpen) {
    return (
      <button className="add-card-btn" onClick={() => setIsOpen(true)}>
        + Add Card
      </button>
    )
  }

  return (
    <form className="add-card-form" onSubmit={handleSubmit}>
      <textarea
        placeholder="Type your thought..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        autoFocus
        rows={3}
      />
      <div className="add-card-actions">
        <button type="submit" className="btn-add">Add</button>
        <button type="button" className="btn-cancel" onClick={() => { setIsOpen(false); setContent('') }}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default AddCardForm
