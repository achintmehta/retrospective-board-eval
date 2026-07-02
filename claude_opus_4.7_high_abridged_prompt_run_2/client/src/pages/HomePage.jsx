import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';
import './HomePage.css';

const SAMPLE_TITLES = [
  'Sprint 42 Retro',
  'Q3 Team Reflection',
  'Post-Launch Retrospective',
  'Design Team Weekly',
  'Ops Incident Review',
];

export default function HomePage() {
  const nav = useNavigate();
  const [boards, setBoards] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [placeholder, setPlaceholder] = useState(SAMPLE_TITLES[0]);

  useEffect(() => {
    api
      .listBoards()
      .then((b) => setBoards(b))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    setPlaceholder(SAMPLE_TITLES[Math.floor(Math.random() * SAMPLE_TITLES.length)]);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    setError('');
    try {
      const board = await api.createBoard(title.trim());
      nav(`/boards/${board.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  return (
    <main className="home">
      <section className="home-hero animate-fade-in">
        <span className="chip home-badge">
          <span className="home-badge-dot" /> real-time · self-hosted
        </span>
        <h1 className="home-title">
          Run retros your team will <span className="gradient-text">actually enjoy</span>.
        </h1>
        <p className="home-lede">
          Collaborative, live-syncing retrospective boards. Add cards, move them around, comment,
          and export — no accounts, no setup, just a name and a link.
        </p>

        <form className="home-create glass animate-pop-in" onSubmit={submit}>
          <input
            className="input home-create-input"
            placeholder={`e.g. "${placeholder}"`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            autoFocus
          />
          <button
            type="submit"
            className="btn btn-primary home-create-btn"
            disabled={!title.trim() || creating}
          >
            {creating ? (
              'Creating…'
            ) : (
              <>
                Create board
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </form>
        {error && <div className="home-error">{error}</div>}
      </section>

      <section className="home-boards animate-fade-in">
        <div className="home-boards-header">
          <h2 className="home-boards-title">Your boards</h2>
          <span className="chip">{boards.length} total</span>
        </div>

        {loading ? (
          <div className="home-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="board-card board-card-skeleton" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="home-empty glass">
            <div className="home-empty-icon">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M8 8v8M12 8v6M16 8v10" strokeLinecap="round" />
              </svg>
            </div>
            <h3>No boards yet</h3>
            <p>Create your first retrospective above to get started.</p>
          </div>
        ) : (
          <div className="home-grid">
            {boards.map((b, idx) => (
              <Link
                key={b.id}
                to={`/boards/${b.id}`}
                className="board-card"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="board-card-glow" />
                <div className="board-card-content">
                  <div className="board-card-header">
                    <h3 className="board-card-title">{b.title}</h3>
                    <span className="board-card-cards">
                      {b.card_count} {b.card_count === 1 ? 'card' : 'cards'}
                    </span>
                  </div>
                  <div className="board-card-meta">
                    <span className="chip">{timeAgo(b.created_at)}</span>
                    <span className="board-card-open">
                      Open
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
