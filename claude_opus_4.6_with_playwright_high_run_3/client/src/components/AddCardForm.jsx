import { useState } from 'react'

export default function AddCardForm({ onAdd }) {
  const [content, setContent] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!content.trim()) return
    onAdd(content.trim())
    setContent('')
  }

  return (
    <form className="add-card-form" onSubmit={handleSubmit}>
      <textarea
        placeholder="Add a card..."
        value={content}
        onChange={e => setContent(e.target.value)}
      />
      <button type="submit">Add Card</button>
    </form>
  )
}
