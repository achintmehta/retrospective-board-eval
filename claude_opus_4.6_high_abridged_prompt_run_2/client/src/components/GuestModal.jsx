import { useState } from 'react'
import styles from './GuestModal.module.css'

export default function GuestModal({ onSubmit }) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (name.trim()) onSubmit(name.trim())
  }

  return (
    <div className={styles.overlay}>
      <form className={styles.modal} onSubmit={handleSubmit}>
        <div className={styles.icon}>&#128100;</div>
        <h2 className={styles.title}>Join the board</h2>
        <p className={styles.subtitle}>Enter a display name to get started</p>
        <input
          className={styles.input}
          type="text"
          placeholder="Your name..."
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={40}
          autoFocus
        />
        <button className={styles.btn} type="submit" disabled={!name.trim()}>
          Continue
        </button>
      </form>
    </div>
  )
}
