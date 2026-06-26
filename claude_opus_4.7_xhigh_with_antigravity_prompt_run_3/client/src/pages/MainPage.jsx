import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Went Well · Needs Improvement · Action Items',
    columns: [
      { title: 'Went Well', emoji: '🌟' },
      { title: 'Needs Improvement', emoji: '🔧' },
      { title: 'Action Items', emoji: '🚀' },
    ],
  },
  {
    id: 'four-l',
    name: '4 Ls',
    description: 'Liked · Learned · Lacked · Longed for',
    columns: [
      { title: 'Liked', emoji: '💜' },
      { title: 'Learned', emoji: '💡' },
      { title: 'Lacked', emoji: '🌫️' },
      { title: 'Longed for', emoji: '✨' },
    ],
  },
  {
    id: 'mad-sad-glad',
    name: 'Mad · Sad · Glad',
    description: 'Surface the team\'s feelings',
    columns: [
      { title: 'Mad', emoji: '🔥' },
      { title: 'Sad', emoji: '💧' },
      { title: 'Glad', emoji: '🌈' },
    ],
  },
  {
    id: 'blank',
    name: 'Blank slate',
    description: 'Start empty and add your own columns',
    columns: [],
  },
];

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState('classic');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api.listBoards()
      .then((data) => { if (!cancelled) { setBoards(data); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
      const board = await api.createBoard({ title: trimmed, columns: template.columns });
      navigate(`/board/${board.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="main-page">
      <section className="hero">
        <div>
          <span className="eyebrow"><span className="dot" /> Real-time collaboration</span>
          <h1 className="hero-title">
            Retros that <span className="accent">flow</span>,<br />
            insights that ship.
          </h1>
          <p className="hero-sub">
            Spin up a board, invite your team with a link, and turn live
            feedback into action — no logins, no SaaS lock-in. Drag, comment,
            and export to CSV when you&rsquo;re done.
          </p>
          <div className="hero-meta">
            <span className="hero-meta-item">
              <CheckIcon /> Live sync over WebSockets
            </span>
            <span className="hero-meta-item">
              <CheckIcon /> Self-hosted on SQLite
            </span>
            <span className="hero-meta-item">
              <CheckIcon /> Export to CSV
            </span>
          </div>
        </div>

        <form className="create-card" onSubmit={handleCreate} id="create-board-form">
          <div className="create-card-title">
            <SparkleIcon />
            <h2>Start a new retro</h2>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="board-title">Board title</label>
            <input
              id="board-title"
              className="input"
              type="text"
              placeholder="e.g. Sprint 27 retrospective"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={120}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <span className="field-label">Template</span>
            <div className="template-grid">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`template-tile${templateId === t.id ? ' is-selected' : ''}`}
                  onClick={() => setTemplateId(t.id)}
                  id={`template-${t.id}`}
                  aria-pressed={templateId === t.id}
                >
                  <strong>{t.name}</strong>
                  <span>{t.description}</span>
                </button>
              ))}
            </div>
          </div>
          {error && <div className="banner is-error">{error}</div>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creating || !title.trim()}
            id="create-board-submit"
          >
            {creating ? 'Creating…' : 'Create board'}
            <ArrowIcon />
          </button>
        </form>
      </section>

      <section>
        <div className="section-head">
          <h2>
            Recent boards
            <span className="count-pill" id="board-count">{boards.length}</span>
          </h2>
        </div>

        {loading ? (
          <div className="board-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton skeleton-tile" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <h2>No boards yet</h2>
            <p>Create your first retro using the form above. It only takes one field.</p>
          </div>
        ) : (
          <div className="board-grid">
            {boards.map((board, idx) => (
              <Link
                key={board.id}
                to={`/board/${board.id}`}
                className="board-tile"
                data-variant={idx % 6}
                id={`board-tile-${board.id}`}
              >
                <span className="eyebrow"><span className="dot" /> Retro</span>
                <div className="board-tile-title">{board.title}</div>
                <div className="board-tile-meta">
                  <span>{formatRelative(board.created_at)}</span>
                  <span className="board-tile-cta">
                    Open <ArrowIcon />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
        }
        .template-tile {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-start;
          text-align: left;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-1);
          font-size: 13px;
          transition: all var(--dur-base) var(--ease-out);
          cursor: pointer;
        }
        .template-tile strong { color: var(--text-0); font-size: 14px; font-weight: 600; }
        .template-tile span { color: var(--text-2); font-size: 12.5px; line-height: 1.4; }
        .template-tile:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--border-strong);
          transform: translateY(-1px);
        }
        .template-tile.is-selected {
          border-color: rgba(124, 92, 255, 0.6);
          background: rgba(124, 92, 255, 0.1);
          box-shadow: 0 0 0 3px rgba(124, 92, 255, 0.15);
        }
        .template-tile.is-selected strong { color: #fff; }
      `}</style>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#sparkg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <defs>
        <linearGradient id="sparkg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path d="m12 3 1.6 4.6L18 9.2l-4.4 1.6L12 15.4l-1.6-4.6L6 9.2l4.4-1.6z" />
      <path d="M19 14v3M17.5 15.5h3M5 17v3M3.5 18.5h3" />
    </svg>
  );
}

function formatRelative(iso) {
  if (!iso) return '';
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, now - then);
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
