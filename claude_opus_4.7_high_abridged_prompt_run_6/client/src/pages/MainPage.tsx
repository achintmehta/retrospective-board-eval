import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import type { BoardSummary } from '../types';

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return 'just now';
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function MainPage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .listBoards()
      .then((data) => {
        if (!cancelled) setBoards(data);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const board = await api.createBoard(trimmed);
      navigate(`/board/${board.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="hero">
        <span className="hero-eyebrow">
          <span className="pulse" /> collaborative retros in real time
        </span>
        <h1>
          Run better <span className="accent">retrospectives</span>
          <br />
          with your team.
        </h1>
        <p>
          A self-hosted, zero-setup retro board. Spin one up, share a link, and
          everyone sees every card land the instant it's posted.
        </p>

        <div className="create-board-card">
          <div className="create-board-card-inner">
            <form className="create-board-form" onSubmit={handleCreate}>
              <input
                type="text"
                placeholder="Name your retro (e.g. Sprint 42)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                autoFocus
              />
              <button
                className="primary-btn"
                disabled={!title.trim() || submitting}
                type="submit"
              >
                {submitting ? 'Creating…' : 'Create board →'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="boards-section">
        <div className="section-header">
          <div className="section-title">Your boards</div>
          <div className="section-count">
            {boards.length} {boards.length === 1 ? 'board' : 'boards'}
          </div>
        </div>

        {loading ? (
          <div className="center-state">
            <div className="spinner" />
            <span>Loading boards…</span>
          </div>
        ) : error ? (
          <div className="empty-state">
            <strong>Something went wrong</strong>
            <span className="error-state">{error}</span>
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <strong>No boards yet</strong>
            <span>Create your first retrospective board above.</span>
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map((b) => (
              <Link key={b.id} to={`/board/${b.id}`} className="board-card">
                <div className="board-card-header">
                  <div className="board-card-title">{b.title}</div>
                  <svg
                    className="board-card-arrow"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M7 17L17 7M17 7H8M17 7V16"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="board-card-meta">
                  Created {formatRelative(b.created_at)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
