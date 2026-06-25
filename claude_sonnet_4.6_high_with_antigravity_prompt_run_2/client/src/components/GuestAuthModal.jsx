import { useState } from 'react'

export default function GuestAuthModal({ onJoin }) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (name.trim()) onJoin(name.trim())
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
      <div className="modal">
        <div className="modal-icon">👤</div>
        <h2 id="guest-modal-title">Join this Board</h2>
        <p>Enter a display name to start collaborating with your team.</p>
        <form className="modal-form" onSubmit={handleSubmit} id="guest-auth-form">
          <input
            id="guest-name-input"
            className="input"
            type="text"
            placeholder="Your display name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            autoFocus
            required
            aria-label="Display name"
          />
          <button
            id="guest-join-btn"
            type="submit"
            className="btn btn-primary"
            disabled={!name.trim()}
          >
            Join Board →
          </button>
        </form>
      </div>
    </div>
  )
}
