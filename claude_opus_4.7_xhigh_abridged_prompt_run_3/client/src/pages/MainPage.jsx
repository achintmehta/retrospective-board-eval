import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api.js';
import CreateBoardForm from '../components/CreateBoardForm.jsx';
import BoardListItem from '../components/BoardListItem.jsx';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listBoards()
      .then((res) => {
        if (!cancelled) setBoards(res.boards || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(title, columns) {
    setCreating(true);
    setError(null);
    try {
      const res = await api.createBoard(title, columns);
      navigate(`/boards/${res.board.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  return (
    <div className="main-page">
      <section className="hero">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="hero__inner"
        >
          <div className="hero__eyebrow">
            <span className="pulse" /> Live, self-hosted retrospectives
          </div>
          <h1 className="hero__title">
            Retros that <span className="grad-text">actually feel</span> real-time.
          </h1>
          <p className="hero__sub">
            Spin up a board, invite your team with a link, and watch ideas land instantly.
            Powered by SQLite and WebSockets — no cloud lock-in.
          </p>
        </motion.div>
      </section>

      <section className="grid-two">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="panel panel--form"
        >
          <div className="panel__head">
            <h2 className="panel__title">Start a new board</h2>
            <p className="panel__sub">Configure columns now or accept the defaults.</p>
          </div>
          <CreateBoardForm onSubmit={handleCreate} loading={creating} />
          {error && <div className="alert alert--error">⚠ {error}</div>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="panel"
        >
          <div className="panel__head">
            <h2 className="panel__title">Boards</h2>
            <p className="panel__sub">
              {loading
                ? 'Loading…'
                : boards.length === 0
                ? 'No boards yet — create your first on the left.'
                : `${boards.length} board${boards.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <ul className="board-list">
            {boards.map((b, i) => (
              <BoardListItem key={b.id} board={b} index={i} />
            ))}
          </ul>
        </motion.div>
      </section>
    </div>
  );
}
