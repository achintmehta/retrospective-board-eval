import { useState } from 'react'

export default function GuestModal({ onSubmit }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
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
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name..."
            autoFocus
          />
          <button type="submit" disabled={!name.trim()}>Join</button>
        </form>
      </div>
    </div>
  )
}
