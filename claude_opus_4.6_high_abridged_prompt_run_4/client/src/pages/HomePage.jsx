import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f1117 0%, #141824 50%, #0f1117 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 24px',
  },
  header: {
    textAlign: 'center',
    marginBottom: 48,
    animation: 'fadeIn 0.6s ease-out',
  },
  logo: {
    fontSize: '2.5rem',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #6c63ff 0%, #a855f7 50%, #6c63ff 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: 8,
    letterSpacing: '-1px',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '1.05rem',
    fontWeight: 300,
  },
  createSection: {
    width: '100%',
    maxWidth: 480,
    marginBottom: 48,
    animation: 'slideUp 0.6s ease-out 0.1s both',
  },
  form: {
    display: 'flex',
    gap: 12,
  },
  input: {
    flex: 1,
    padding: '14px 18px',
    fontSize: '0.95rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
  },
  createBtn: {
    padding: '14px 28px',
    background: 'var(--gradient-accent)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    borderRadius: 'var(--radius)',
    border: 'none',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 16px rgba(108, 99, 255, 0.3)',
  },
  boardsSection: {
    width: '100%',
    maxWidth: 680,
    animation: 'slideUp 0.6s ease-out 0.2s both',
  },
  sectionTitle: {
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: 'var(--text-muted)',
    marginBottom: 16,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  boardCard: {
    background: 'var(--gradient-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px 24px',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
  },
  boardTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 6,
  },
  boardDate: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  emptyState: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '40px 0',
    fontSize: '0.95rem',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: 'var(--gradient-accent)',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
};

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then((r) => r.json())
      .then(setBoards)
      .finally(() => setLoading(false));
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

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'Z');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>RetroBoard</div>
        <div style={styles.subtitle}>Real-time retrospectives for your team</div>
      </div>

      <div style={styles.createSection}>
        <form onSubmit={handleCreate} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Enter board name..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="submit" style={styles.createBtn}>
            Create Board
          </button>
        </form>
      </div>

      <div style={styles.boardsSection}>
        <div style={styles.sectionTitle}>Your Boards</div>
        {loading ? (
          <div style={styles.emptyState}>Loading...</div>
        ) : boards.length === 0 ? (
          <div style={styles.emptyState}>
            No boards yet. Create your first retrospective board above.
          </div>
        ) : (
          <div style={styles.grid}>
            {boards.map((board) => (
              <div
                key={board.id}
                style={styles.boardCard}
                onClick={() => navigate(`/board/${board.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-hover)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow)';
                  e.currentTarget.querySelector('.accent-bar').style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.querySelector('.accent-bar').style.opacity = '0';
                }}
              >
                <div className="accent-bar" style={styles.accentBar} />
                <div style={styles.boardTitle}>{board.title}</div>
                <div style={styles.boardDate}>{formatDate(board.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
