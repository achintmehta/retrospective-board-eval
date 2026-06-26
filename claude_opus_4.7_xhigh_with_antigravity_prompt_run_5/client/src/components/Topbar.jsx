import { Link } from 'react-router-dom';

export default function Topbar({ right }) {
  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="Retro home">
        <span className="brand-mark" aria-hidden>R</span>
        <span>
          <span className="brand-name">Retro</span>
          <span className="brand-tag">realtime</span>
        </span>
      </Link>
      <div className="topbar-actions">{right}</div>
    </header>
  );
}
