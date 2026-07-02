import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Board } from '../types';
import { Nav } from '../components/Nav';

function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

export function HomePage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .listBoards()
      .then((rows) => setBoards(rows))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || creating) return;
    setCreating(true);
    setError(null);
    try {
      const board = await api.createBoard(t);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError((err as Error).message);
      setCreating(false);
    }
  }

  return (
    <div className="app-shell">
      <Nav />
      <main className="home">
        <section className="hero">
          <span className="eyebrow">Real-time retrospectives</span>
          <h1>
            Run better retros. <br />
            <span className="grad">Together, in real time.</span>
          </h1>
          <p>
            A self-hosted, no-signup retrospective board. Create a room, invite the team,
            and watch every card, comment, and move sync instantly.
          </p>

          <form className="create-form" onSubmit={submit}>
            <input
              className="input grow"
              placeholder="e.g. Sprint 42 Retro"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoFocus
            />
            <button className="btn btn-primary" disabled={!title.trim() || creating}>
              {creating ? 'Creating…' : 'Create board'}
            </button>
          </form>
        </section>

        <div className="section-header">
          <h2>Your boards</h2>
          <span className="muted">{boards.length} total</span>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="center"><div className="spinner" /></div>
        ) : boards.length === 0 ? (
          <div className="empty">No boards yet. Create your first one above.</div>
        ) : (
          <div className="boards-grid">
            {boards.map((b) => (
              <Link key={b.id} to={`/boards/${b.id}`} className="board-card">
                <h3>{b.title}</h3>
                <div className="meta">Created {timeAgo(b.created_at)}</div>
                <span className="go">Open board →</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
