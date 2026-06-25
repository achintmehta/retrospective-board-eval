import { useState } from 'react'

function GuestAuthModal({ onJoin }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      onJoin(name.trim())
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 32,
        width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{ marginBottom: 8 }}>Join Board</h2>
        <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>
          Enter your display name to participate
        </p>
        <form onSubmit={handleSubmit}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name..."
            autoFocus
            style={{ marginBottom: 16 }}
          />
          <button
            type="submit"
            style={{
              width: '100%', background: '#4a90d9', color: '#fff',
              padding: '10px 16px', fontSize: 15
            }}
          >
            Join
          </button>
        </form>
      </div>
    </div>
  )
}

export default GuestAuthModal
