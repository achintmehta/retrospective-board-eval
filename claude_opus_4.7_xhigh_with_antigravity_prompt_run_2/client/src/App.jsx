import { Outlet, Link, useLocation } from 'react-router-dom';
import './App.css';

export default function App() {
  const location = useLocation();
  const onBoard = location.pathname.startsWith('/boards/');
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand" aria-label="Retro home">
          <span className="brand-mark" aria-hidden="true">
            <span className="bar bar-1" />
            <span className="bar bar-2" />
            <span className="bar bar-3" />
          </span>
          <span className="brand-name">Retro</span>
          <span className="brand-tag">real-time</span>
        </Link>
        <nav className="app-nav">
          {onBoard ? (
            <Link to="/" className="btn btn-ghost btn-sm">
              ← All boards
            </Link>
          ) : (
            <a
              href="https://github.com"
              className="btn btn-ghost btn-sm"
              target="_blank"
              rel="noreferrer noopener"
            >
              Docs
            </a>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
