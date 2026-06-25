import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [columns, setColumns] = useState([...DEFAULT_COLUMNS]);
  const [newCol, setNewCol] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
      .then(data => setBoards(data))
      .finally(() => setLoading(false));
  }, []);

  const handleAddCol = (e) => {
    e.preventDefault();
    const trimmed = newCol.trim();
    if (trimmed && !columns.includes(trimmed)) {
      setColumns(prev => [...prev, trimmed]);
      setNewCol('');
    }
  };

  const handleRemoveCol = (col) => {
    setColumns(prev => prev.filter(c => c !== col));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), columns })
      });
      const board = await res.json();
      if (res.ok) {
        navigate(`/board/${board.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <main className="main-content">
      <div className="hero-banner">
        <div className="hero-title">Real-time Retrospectives</div>
        <p className="hero-subtitle">Create boards, add cards, collaborate live — no accounts needed.</p>
      </div>

      <div className="main-page-grid">
        {/* Create Board Panel */}
        <aside>
          <div className="create-board-card">
            <div className="create-board-title">New Board</div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="board-title-input">Board Title</label>
                <input
                  id="board-title-input"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Sprint 42 Retro"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Columns</label>
                <div className="column-tags">
                  {columns.map(col => (
                    <span key={col} className="column-tag">
                      {col}
                      <button type="button" className="remove-tag" onClick={() => handleRemoveCol(col)} aria-label={`Remove ${col}`}>×</button>
                    </span>
                  ))}
                </div>
                <div className="add-column-row" style={{ marginTop: 8 }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Add column..."
                    value={newCol}
                    onChange={e => setNewCol(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddCol} id="add-col-btn">+</button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!title.trim() || creating}
                id="create-board-btn"
              >
                {creating ? 'Creating...' : '✦ Create Board'}
              </button>
            </form>
          </div>
        </aside>

        {/* Boards List */}
        <section>
          <h2 className="boards-section-title">
            Your Boards
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>{boards.length} board{boards.length !== 1 ? 's' : ''}</span>
          </h2>

          {loading ? (
            <div className="loading-container" style={{ minHeight: 160 }}>
              <div className="spinner" />
            </div>
          ) : boards.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No boards yet</div>
              <p className="empty-state-text">Create your first retrospective board to get started.</p>
            </div>
          ) : (
            <div className="boards-grid">
              {boards.map(board => (
                <Link key={board.id} to={`/board/${board.id}`} className="board-item" id={`board-${board.id}`}>
                  <div className="board-item-title">{board.title}</div>
                  <div className="board-item-meta">{formatDate(board.created_at)}</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
