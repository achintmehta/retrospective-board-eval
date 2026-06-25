import { useState } from 'react'

function GuestModal({ onSubmit }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim())
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Join Retrospective</h2>
        <p style={styles.subtitle}>Enter your display name to participate</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Your name..."
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            style={styles.input}
          />
          <button type="submit" style={styles.button}>Join</button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--surface)',
    borderRadius: 12,
    padding: 32,
    width: 400,
    maxWidth: '90%',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8,
  },
  subtitle: {
    color: 'var(--text-muted)',
    marginBottom: 24,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  input: {
    padding: '12px 16px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 16,
    outline: 'none',
    textAlign: 'center',
  },
  button: {
    padding: '12px',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
  },
}

export default GuestModal
