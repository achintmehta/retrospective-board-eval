import { useState } from 'react'
import './GuestModal.css'

function GuestModal({ onSubmit }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) onSubmit(name.trim())
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="16" r="8" stroke="var(--accent)" strokeWidth="2" fill="none" />
            <path d="M6 36c0-7.7 6.3-14 14-14s14 6.3 14 14" stroke="var(--accent)" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <h2>Welcome to RetroBoard</h2>
        <p className="modal-description">
          Enter a display name to join the session and start collaborating.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
            className="modal-input"
            autoFocus
            maxLength={40}
          />
          <button type="submit" className="btn-primary modal-btn" disabled={!name.trim()}>
            Join Session
          </button>
        </form>
      </div>
    </div>
  )
}

export default GuestModal
