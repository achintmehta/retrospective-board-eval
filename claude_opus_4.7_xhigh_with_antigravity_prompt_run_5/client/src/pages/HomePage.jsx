import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar.jsx';
import { api } from '../lib/api';
import { useToast } from '../components/Toasts.jsx';

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const refresh = async () => {
    try {
      const list = await api.listBoards();
      setBoards(list);
    } catch (err) {
      toast.push(err.message, { kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const board = await api.createBoard(trimmed);
      toast.push(`Created "${board.title}"`);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      toast.push(err.message, { kind: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="app-shell">
      <Topbar />
      <main>
        <section className="hero">
          <div>
            <h1>Retrospectives that feel alive.</h1>
            <p>
              Self-hosted, real-time, no-friction. Spin up a board, drop in cards,
              comment on the messy bits — everything syncs instantly across the team.
            </p>
          </div>
          <div className="create-card">
            <h2>Start a new board</h2>
            <form onSubmit={handleCreate}>
              <input
                id="new-board-title"
                className="input"
                placeholder="Sprint 42 retro"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
              />
              <button
                id="create-board-button"
                type="submit"
                className="btn btn-primary"
                disabled={!title.trim() || creating}
              >
                {creating ? 'Creating…' : 'Create board ↗'}
              </button>
            </form>
          </div>
        </section>

        <div className="section-title">
          <h2>Your boards</h2>
          <span className="count">{loading ? '—' : `${boards.length} total`}</span>
        </div>

        {loading ? (
          <div className="row dim" style={{ padding: '24px 4px' }}>
            <span className="spinner" /> Loading boards…
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <div className="icon" aria-hidden>✦</div>
            <div style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: 4 }}>
              No boards yet
            </div>
            <div>Create your first retrospective board above to get started.</div>
          </div>
        ) : (
          <div className="board-grid" id="board-list">
            {boards.map((b) => (
              <button
                key={b.id}
                className="board-tile"
                id={`board-tile-${b.id}`}
                onClick={() => navigate(`/boards/${b.id}`)}
              >
                <div className="accent-strip" aria-hidden />
                <div>
                  <h3>{b.title}</h3>
                  <div className="meta">
                    <span>{formatDate(b.created_at)}</span>
                    <span>{b.card_count} {b.card_count === 1 ? 'card' : 'cards'}</span>
                  </div>
                </div>
                <div className="dim" style={{ fontSize: '0.78rem' }}>Open board →</div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
