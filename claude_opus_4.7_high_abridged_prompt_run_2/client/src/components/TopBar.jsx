import { Link, useLocation } from 'react-router-dom';
import './TopBar.css';

export default function TopBar() {
  const loc = useLocation();
  const isBoard = loc.pathname.startsWith('/boards/');

  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand">
        <span className="topbar-logo" aria-hidden>
          <svg viewBox="0 0 32 32" width="26" height="26">
            <defs>
              <linearGradient id="tb-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7c5cff" />
                <stop offset="1" stopColor="#3ec1ff" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#tb-grad)" />
            <rect x="7" y="9" width="4.5" height="14" rx="1.5" fill="#fff" />
            <rect x="13.75" y="9" width="4.5" height="10" rx="1.5" fill="#fff" opacity=".8" />
            <rect x="20.5" y="9" width="4.5" height="7" rx="1.5" fill="#fff" opacity=".6" />
          </svg>
        </span>
        <span className="topbar-wordmark">
          Retro
          <span className="topbar-wordmark-sub">.board</span>
        </span>
      </Link>
      <nav className="topbar-nav">
        {isBoard && (
          <Link to="/" className="btn btn-ghost topbar-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All boards
          </Link>
        )}
      </nav>
    </header>
  );
}
