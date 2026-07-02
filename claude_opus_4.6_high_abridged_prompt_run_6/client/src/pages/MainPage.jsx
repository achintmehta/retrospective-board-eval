import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './MainPage.module.css';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then((r) => r.json())
      .then((data) => {
        setBoards(data);
        setLoading(false);
      });
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    });
    const board = await res.json();
    navigate(`/board/${board.id}`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoMark}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="url(#g1)" />
            <path d="M10 12h5v12h-5zM16 10h5v14h-5zM22 14h5v10h-5z" fill="rgba(255,255,255,0.9)" rx="2" />
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="36" y2="36">
                <stop stopColor="#6c5ce7" />
                <stop offset="1" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className={styles.title}>Retro Board</h1>
        <p className={styles.subtitle}>Collaborate in real-time. Reflect, improve, repeat.</p>
      </header>

      <form className={styles.createForm} onSubmit={handleCreate}>
        <input
          className={styles.input}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sprint 42 Retrospective..."
          autoFocus
        />
        <button className={styles.createBtn} type="submit">
          <span className={styles.btnIcon}>+</span>
          Create Board
        </button>
      </form>

      <section className={styles.boardsSection}>
        <h2 className={styles.sectionTitle}>Your Boards</h2>
        {loading ? (
          <div className={styles.loadingPulse}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="6" y="10" width="36" height="28" rx="4" stroke="var(--text-muted)" strokeWidth="2" fill="none" />
                <line x1="18" y1="10" x2="18" y2="38" stroke="var(--text-muted)" strokeWidth="2" />
                <line x1="30" y1="10" x2="30" y2="38" stroke="var(--text-muted)" strokeWidth="2" />
              </svg>
            </div>
            <p>No boards yet. Create one to get started!</p>
          </div>
        ) : (
          <div className={styles.boardGrid}>
            {boards.map((board) => (
              <Link key={board.id} to={`/board/${board.id}`} className={styles.boardCard}>
                <div className={styles.cardAccent} />
                <h3 className={styles.boardTitle}>{board.title}</h3>
                <span className={styles.boardDate}>
                  {new Date(board.created_at + 'Z').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className={styles.arrow}>&#8594;</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
