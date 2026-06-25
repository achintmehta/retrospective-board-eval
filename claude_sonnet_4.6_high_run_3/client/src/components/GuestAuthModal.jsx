import { useState } from 'react'

export default function GuestAuthModal({ onConfirm }) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 12, padding: 32,
        width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ marginBottom: 8 }}>Join Board</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          Enter a display name to participate in this retrospective.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            autoFocus
            type="text"
            placeholder="Your display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
          <button
            type="submit"
            disabled={!name.trim()}
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            Join
          </button>
        </form>
      </div>
    </div>
  )
}
