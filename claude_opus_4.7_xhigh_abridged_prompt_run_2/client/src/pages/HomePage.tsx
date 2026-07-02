import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { BoardSummary } from '../types';
import TopBar from '../components/TopBar';
import { useDisplayName } from '../hooks/useDisplayName';
import './HomePage.css';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return `Today · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HomePage() {
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName] = useDisplayName();
  const navigate = useNavigate();

  useEffect(() => {
    api.listBoards().then(setBoards).catch((e) => setError(String(e)));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean || creating) return;
    setCreating(true);
    try {
      const board = await api.createBoard(clean);
      setTitle('');
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="app-shell">
      <TopBar
        right={
          displayName ? (
            <span className="chip chip-gradient" title="Your display name">
              <span aria-hidden style={{ fontSize: '0.9em' }}>◆</span>
              {displayName}
            </span>
          ) : null
        }
      />

      <main className="home-main">
        <section className="hero fade-up">
          <div className="hero-eyebrow">
            <span className="pulse-dot" />
            <span>Real-time · self-hosted · privacy-first</span>
          </div>
          <h1 className="hero-title">
            Retros that feel <span className="gradient-text">alive</span>.
          </h1>
          <p className="hero-sub">
            Collaborative retrospective boards that sync in real time — no accounts, no SaaS,
            no compromises. Spin up a board, drop the link in your team channel, and start
            surfacing what actually matters.
          </p>

          <form className="hero-form" onSubmit={handleCreate}>
            <input
              className="input hero-input"
              placeholder="Sprint 42 · Q3 Retro · Post-mortem…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              aria-label="New board title"
            />
            <button
              className="btn btn-primary hero-btn"
              disabled={!title.trim() || creating}
              type="submit"
            >
              {creating ? 'Creating…' : 'Create board'}
              <span aria-hidden>✨</span>
            </button>
          </form>
        </section>

        <section className="boards-section">
          <header className="boards-header">
            <h2>Your boards</h2>
            {boards && (
              <span className="chip">
                {boards.length} {boards.length === 1 ? 'board' : 'boards'}
              </span>
            )}
          </header>

          {error && <div className="error-banner">{error}</div>}

          {!boards && (
            <div className="board-grid">
              {[0, 1, 2].map((i) => (
                <div key={i} className="board-card panel shimmer" style={{ height: 132 }} />
              ))}
            </div>
          )}

          {boards && boards.length === 0 && (
            <div className="empty-state panel fade-up">
              <div className="empty-glyph" aria-hidden>
                <span>◐</span>
              </div>
              <div>
                <h3 className="mb-2">No boards yet</h3>
                <p className="text-secondary" style={{ margin: 0 }}>
                  Create your first retro above. It takes about eight seconds.
                </p>
              </div>
            </div>
          )}

          {boards && boards.length > 0 && (
            <div className="board-grid">
              {boards.map((b, idx) => (
                <button
                  key={b.id}
                  className="board-card panel panel-hover fade-up"
                  style={{ animationDelay: `${idx * 40}ms` }}
                  onClick={() => navigate(`/boards/${b.id}`)}
                >
                  <div className="board-card-accent" aria-hidden />
                  <div className="board-card-body">
                    <div className="board-card-meta">
                      <span className="chip">Board</span>
                      <span className="text-tertiary tiny">{formatDate(b.created_at)}</span>
                    </div>
                    <h3 className="board-card-title">{b.title}</h3>
                    <div className="board-card-open">
                      <span>Open board</span>
                      <span aria-hidden className="board-card-arrow">→</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <span className="text-muted small">
          Retro · Built for teams that ship. SQLite + WebSockets in a single container.
        </span>
      </footer>
    </div>
  );
}
