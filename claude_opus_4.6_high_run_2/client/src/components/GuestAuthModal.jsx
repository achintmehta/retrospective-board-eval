import { useState } from 'react'
import './GuestAuthModal.css'

function GuestAuthModal({ onJoin }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      onJoin(name.trim())
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Join Board</h2>
        <p>Enter your display name to start collaborating.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button type="submit">Join</button>
        </form>
      </div>
    </div>
  )
}

export default GuestAuthModal
