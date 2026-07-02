import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    background: 'linear-gradient(180deg, #0f0f13 0%, #12121a 50%, #0f0f13 100%)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 48,
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #6c5ce7, #e84393)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    boxShadow: '0 4px 20px rgba(108, 92, 231, 0.3)',
  },
  title: {
    fontSize: 36,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #e8e6f0, #9b97a8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: 16,
  },
  createSection: {
    width: '100%',
    maxWidth: 520,
    marginBottom: 48,
  },
  form: {
    display: 'flex',
    gap: 10,
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: 15,
    transition: 'border-color var(--transition), box-shadow var(--transition)',
  },
  createBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #6c5ce7, #5a4bd1)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform var(--transition), box-shadow var(--transition)',
    whiteSpace: 'nowrap',
  },
  boardsList: {
    width: '100%',
    maxWidth: 520,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: 16,
  },
  boardCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 10,
    cursor: 'pointer',
    transition: 'all var(--transition)',
    textDecoration: 'none',
  },
  boardTitle: {
    fontSize: 16,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  boardDate: {
    fontSize: 13,
    color: 'var(--text-muted)',
  },
  arrow: {
    color: 'var(--text-muted)',
    fontSize: 18,
    transition: 'transform var(--transition)',
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    color: 'var(--text-muted)',
    fontSize: 15,
  },
};

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getBoards().then(setBoards).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const board = await api.createBoard(title.trim());
    setTitle('');
    navigate(`/board/${board.id}`);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
        </div>
        <h1 style={styles.title}>RetroBoard</h1>
        <p style={styles.subtitle}>Real-time retrospective collaboration for teams</p>
      </header>

      <div style={styles.createSection}>
        <form style={styles.form} onSubmit={handleCreate}>
          <input
            style={styles.input}
            type="text"
            placeholder="Enter board name..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--border-focus)';
              e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            style={styles.createBtn}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 16px rgba(108, 92, 231, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Create Board
          </button>
        </form>
      </div>

      <div style={styles.boardsList}>
        <div style={styles.sectionLabel}>Your Boards</div>
        {loading ? (
          <div style={styles.empty}>Loading...</div>
        ) : boards.length === 0 ? (
          <div style={styles.empty}>No boards yet. Create one above to get started.</div>
        ) : (
          boards.map((board) => (
            <div
              key={board.id}
              style={styles.boardCard}
              onClick={() => navigate(`/board/${board.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-focus)';
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.querySelector('.arrow').style.transform = 'translateX(3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.querySelector('.arrow').style.transform = 'translateX(0)';
              }}
            >
              <div>
                <div style={styles.boardTitle}>{board.title}</div>
                <div style={styles.boardDate}>
                  {new Date(board.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </div>
              </div>
              <span className="arrow" style={styles.arrow}>&rarr;</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
