import { useState } from 'react'

export default function GuestAuthModal({ onJoin }) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (name.trim()) onJoin(name.trim())
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Welcome!</h2>
        <p>Enter your display name to join this board.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={50}
          />
          <button type="submit" disabled={!name.trim()}>
            Join Board
          </button>
        </form>
      </div>
    </div>
  )
}
