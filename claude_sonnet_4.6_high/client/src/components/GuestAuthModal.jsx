import { useState } from 'react'

export default function GuestAuthModal({ onJoin }) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onJoin(trimmed)
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Join Board</h2>
        <p>Enter your display name to participate</p>
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
            Join
          </button>
        </form>
      </div>
    </div>
  )
}
