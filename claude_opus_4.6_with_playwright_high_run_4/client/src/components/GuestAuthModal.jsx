import { useState } from 'react'

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: 'white', borderRadius: 12, padding: 32, width: 360,
    boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
  },
  title: { fontSize: 20, marginBottom: 8 },
  subtitle: { color: '#666', marginBottom: 24, fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
}

export default function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) onSubmit(name.trim())
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Welcome!</h2>
        <p style={styles.subtitle}>Enter your display name to join the board</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name..."
            autoFocus
          />
          <button type="submit">Join Board</button>
        </form>
      </div>
    </div>
  )
}
