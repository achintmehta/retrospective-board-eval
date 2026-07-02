import { useState } from 'react';
import styles from './GuestModal.module.css';

export default function GuestModal({ onSubmit }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.iconWrap}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="20" r="8" stroke="url(#gm)" strokeWidth="2.5" fill="none" />
            <path d="M12 40c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="url(#gm)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <defs>
              <linearGradient id="gm" x1="12" y1="12" x2="36" y2="40">
                <stop stopColor="#6c5ce7" />
                <stop offset="1" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h2 className={styles.title}>Welcome!</h2>
        <p className={styles.desc}>Enter your display name to join the retrospective.</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={styles.input}
            autoFocus
            maxLength={30}
          />
          <button type="submit" className={styles.btn} disabled={!name.trim()}>
            Join Board
          </button>
        </form>
      </div>
    </div>
  );
}
