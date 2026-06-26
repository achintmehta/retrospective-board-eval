import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatRelative } from '../lib/time.js';
import Toast from '../components/Toast.jsx';

const FEATURE_PILLS = [
  { label: 'Realtime sync', icon: 'lightning' },
  { label: 'Drag & drop', icon: 'hand' },
  { label: 'Nested comments', icon: 'chat' },
  { label: 'CSV export', icon: 'download' },
  { label: 'Self-hosted', icon: 'shield' }
];

const PILL_ICONS = {
  lightning: <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />,
  hand: <path d="M9 11V6a2 2 0 0 1 4 0v5m0-2a2 2 0 0 1 4 0v6m0-4a2 2 0 0 1 4 0v6a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-3l-2-4a1 1 0 0 1 1.5-1.3L8 10" />,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
};

function Icon({ name }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PILL_ICONS[name]}
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let mounted = true;
    api
      .listBoards()
      .then((rows) => mounted && setBoards(rows))
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setCreating(true);
    try {
      const board = await api.createBoard(t);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setToast({ message: err.message || 'Could not create board', kind: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="dot" /> Live · Self-hosted
          </span>
          <h1>
            Run beautiful <span className="gradient-text">team retros</span><br />
            in real-time.
          </h1>
          <p className="lead">
            A fast, collaborative retrospective board that lives on your own infrastructure.
            Drag cards, drop comments, sync instantly across the team — no SaaS sign-ups, no surprises.
          </p>
          <div className="hero-pills">
            {FEATURE_PILLS.map((p) => (
              <span key={p.label} className="pill">
                <Icon name={p.icon} />
                {p.label}
              </span>
            ))}
          </div>
        </div>

        <form className="card-surface create-card" onSubmit={handleCreate} aria-label="Create a new retrospective board">
          <h2>Start a new retro</h2>
          <p className="sub">A board comes pre-loaded with three classic columns. You can add more anytime.</p>
          <div className="field">
            <label className="label" htmlFor="board-title">Board title</label>
            <input
              id="board-title"
              className="input"
              placeholder="Sprint 42 retrospective"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
          </div>
          <div className="row">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating || !title.trim()}
              id="create-board-submit"
            >
              {creating ? 'Creating…' : 'Create board'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14"/>
                <path d="M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="section-head">
          <h2>
            Your boards
            <span className="count">{boards.length} {boards.length === 1 ? 'board' : 'boards'}</span>
          </h2>
        </div>

        <div style={{ height: 16 }} />

        {loading && (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" />
            Loading boards…
          </div>
        )}

        {!loading && error && (
          <div className="error-state">{error}</div>
        )}

        {!loading && !error && boards.length === 0 && (
          <div className="empty-state">
            <h3>No boards yet</h3>
            <p>Create your first retrospective board above to get started.</p>
          </div>
        )}

        {!loading && !error && boards.length > 0 && (
          <div className="board-grid" id="board-grid">
            {boards.map((b) => (
              <a
                key={b.id}
                href={`/boards/${b.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/boards/${b.id}`);
                }}
                className="board-tile"
                id={`board-tile-${b.id}`}
              >
                <h3>{b.title}</h3>
                <div className="board-tile-meta">
                  <span>Created {formatRelative(b.createdAt)}</span>
                  <span className="badge">{b.cardCount} {b.cardCount === 1 ? 'card' : 'cards'}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {toast && (
        <Toast
          message={toast.message}
          kind={toast.kind}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
