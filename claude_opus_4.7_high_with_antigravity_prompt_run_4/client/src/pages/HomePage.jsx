import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../components/Toast.jsx';

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HomePage() {
  const [boards, setBoards] = useState(null);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api
      .listBoards()
      .then((data) => {
        if (!cancelled) setBoards(data);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.push(err.message, { kind: 'error' });
          setBoards([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const board = await api.createBoard(trimmed);
      toast.push(`Created “${board.title}”`, { kind: 'success' });
      navigate(`/boards/${board.id}`);
    } catch (err) {
      toast.push(err.message, { kind: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="home container">
      <section className="hero">
        <span className="hero-eyebrow"><span className="chip-dot" /> Self-hosted · realtime · zero setup</span>
        <h1 className="hero-title">
          Retros your team will <em>actually</em> show up for.
        </h1>
        <p className="hero-sub">
          A frictionless, collaborative retrospective board. Spin one up, share the link, and
          watch teammates drop cards, drag them around, and comment — all in real time.
        </p>
      </section>

      <section className="hero-grid">
        <div className="glass create-card">
          <div>
            <span className="chip"><span className="chip-dot" /> New board</span>
            <h2 style={{ marginTop: 10 }}>Start a fresh retrospective</h2>
            <p>We&apos;ll seed it with classic columns: Went Well · Needs Improvement · Action Items.</p>
          </div>
          <form className="create-form" onSubmit={handleCreate} id="create-board-form">
            <input
              id="create-board-title"
              className="input"
              placeholder="e.g. Sprint 42 retrospective"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoComplete="off"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!title.trim() || submitting}
              id="create-board-submit"
            >
              {submitting ? 'Creating…' : 'Create board →'}
            </button>
          </form>
        </div>

        <FeatureList />
      </section>

      <div className="section-header">
        <h2>Your boards</h2>
        <span className="hint">
          {Array.isArray(boards) ? `${boards.length} total` : 'Loading…'}
        </span>
      </div>

      {boards === null && (
        <div className="boards-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 130 }} />
          ))}
        </div>
      )}

      {Array.isArray(boards) && boards.length === 0 && (
        <div className="empty">
          No boards yet. Create one above to get started.
        </div>
      )}

      {Array.isArray(boards) && boards.length > 0 && (
        <div className="boards-grid">
          {boards.map((b) => (
            <Link key={b.id} to={`/boards/${b.id}`} className="board-card glass" id={`board-card-${b.id}`}>
              <div>
                <h3>{b.title}</h3>
              </div>
              <div className="board-meta">
                <span>{b.column_count} columns</span>
                <span>{b.card_count} cards</span>
                <span>{formatDate(b.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function FeatureList() {
  const items = [
    { title: 'Real-time everything', body: 'Cards, drags, and comments sync across every browser instantly via WebSockets.' },
    { title: 'Guest in one click', body: 'No accounts or invites. Drop in a display name and start collaborating.' },
    { title: 'Export to CSV', body: 'Capture outcomes in one click for tickets, follow-ups, or stakeholder notes.' },
  ];
  return (
    <ul className="glass" style={{ listStyle: 'none', padding: 20, display: 'grid', gap: 14, margin: 0 }}>
      {items.map((f) => (
        <li key={f.title} style={{ display: 'flex', gap: 12 }}>
          <span
            aria-hidden="true"
            style={{
              flex: '0 0 36px',
              width: 36, height: 36,
              borderRadius: 10,
              background: 'var(--grad-brand-soft)',
              border: '1px solid rgba(124,92,255,0.35)',
              display: 'grid', placeItems: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cdb8ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{f.title}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>{f.body}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
