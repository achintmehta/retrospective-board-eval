import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

function formatDate(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function BoardListItem({ board, index }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="board-list__item"
    >
      <Link to={`/boards/${board.id}`} className="board-list__link">
        <div className="board-list__mark" aria-hidden="true" />
        <div className="board-list__body">
          <div className="board-list__title">{board.title}</div>
          <div className="board-list__meta">Created {formatDate(board.created_at)}</div>
        </div>
        <span className="board-list__arrow">→</span>
      </Link>
    </motion.li>
  );
}
