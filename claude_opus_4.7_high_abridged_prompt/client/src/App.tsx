import { Link, Outlet, useLocation } from 'react-router-dom';

export default function App() {
  const loc = useLocation();
  const onBoard = loc.pathname.startsWith('/boards/');

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand" aria-label="Retro Board home">
          <span className="brand-mark" aria-hidden />
          <span className="brand-text">
            Retro<span className="brand-accent">Board</span>
          </span>
        </Link>
        <nav className="app-nav">
          {onBoard && (
            <Link to="/" className="nav-link">
              ← All boards
            </Link>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <div className="app-bg" aria-hidden />
    </div>
  );
}
