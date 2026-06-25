import { useState } from 'react'

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 12,
    padding: 32,
    width: 400,
    maxWidth: '90vw',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8,
    color: '#1a1a2e',
  },
  subtitle: {
    color: '#666',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 16,
    outline: 'none',
    marginBottom: 16,
  },
  btn: {
    width: '100%',
    padding: '12px 24px',
    background: '#646cff',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
  },
}

export default function GuestAuthModal({ onJoin }) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (name.trim()) {
      onJoin(name.trim())
    }
  }

  return (
    <div style={styles.overlay}>
      <form style={styles.modal} onSubmit={handleSubmit}>
        <h2 style={styles.title}>Join Board</h2>
        <p style={styles.subtitle}>Enter your display name to start collaborating</p>
        <input
          style={styles.input}
          type="text"
          placeholder="Your display name..."
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
        <button type="submit" style={styles.btn}>Join</button>
      </form>
    </div>
  )
}
