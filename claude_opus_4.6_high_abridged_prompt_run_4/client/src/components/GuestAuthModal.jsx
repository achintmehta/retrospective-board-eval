import { useState } from 'react';

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease-out',
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    textAlign: 'center',
    boxShadow: 'var(--shadow-lg)',
    animation: 'scaleIn 0.3s ease-out',
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'var(--gradient-accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontSize: '1.5rem',
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: 600,
    marginBottom: 8,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    padding: '14px 18px',
    fontSize: '1rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    textAlign: 'center',
    marginBottom: 16,
  },
  btn: {
    width: '100%',
    padding: '14px',
    background: 'var(--gradient-accent)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.95rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    boxShadow: '0 4px 16px rgba(108, 99, 255, 0.3)',
  },
};

export default function GuestAuthModal({ onSubmit }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div style={styles.overlay}>
      <form style={styles.modal} onSubmit={handleSubmit}>
        <div style={styles.icon}>
          <span role="img" aria-label="wave">&#x1F44B;</span>
        </div>
        <div style={styles.title}>Join the Board</div>
        <div style={styles.subtitle}>Enter your display name to start collaborating</div>
        <input
          style={styles.input}
          type="text"
          placeholder="Your name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <button type="submit" style={styles.btn}>
          Join
        </button>
      </form>
    </div>
  );
}
