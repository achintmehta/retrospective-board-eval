import { useState } from 'react'

export default function GuestModal({ onSubmit }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) onSubmit(name.trim())
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.glow} />
        <div style={styles.iconWrap}>
          <span style={styles.icon}>&#9786;</span>
        </div>
        <h2 style={styles.title}>Welcome to RetroBoard</h2>
        <p style={styles.subtitle}>Enter your display name to join the session</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            style={styles.input}
          />
          <button type="submit" style={styles.btn}>
            Join Session &#8594;
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10,12,18,0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: 'linear-gradient(145deg, #1a1d27 0%, #1e2230 100%)',
    border: '1px solid #2e3346',
    borderRadius: '20px',
    padding: '48px 40px',
    width: '400px',
    maxWidth: '90vw',
    textAlign: 'center',
    position: 'relative',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 120px rgba(108,99,255,0.08)',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: '-60px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '200px',
    height: '200px',
    background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  iconWrap: {
    marginBottom: '16px',
  },
  icon: {
    fontSize: '48px',
    filter: 'grayscale(0.3)',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#e8eaf0',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#9499ad',
    marginBottom: '28px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  input: {
    background: '#0f1117',
    border: '1px solid #2e3346',
    borderRadius: '10px',
    color: '#e8eaf0',
    padding: '14px 16px',
    fontSize: '15px',
    textAlign: 'center',
    fontFamily: "'Inter', sans-serif",
    transition: 'border-color 200ms, box-shadow 200ms',
  },
  btn: {
    background: 'linear-gradient(135deg, #6c63ff 0%, #5a52e0 100%)',
    color: '#fff',
    padding: '14px 28px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(108,99,255,0.3)',
    transition: 'transform 150ms, box-shadow 150ms',
  },
}
