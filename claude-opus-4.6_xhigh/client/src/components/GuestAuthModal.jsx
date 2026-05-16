import { useState } from 'react'
import './GuestAuthModal.css'

export default function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim())
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Join Board</h2>
        <p>Enter your display name to participate</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name..."
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <button type="submit">Join</button>
        </form>
      </div>
    </div>
  )
}
