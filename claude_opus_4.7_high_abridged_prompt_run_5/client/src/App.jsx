import { Outlet, Link, useLocation } from 'react-router-dom';

export default function App() {
  const location = useLocation();
  const onBoard = location.pathname.startsWith('/board/');

  return (
    <div className="app-shell">
      <div className="ambient-glow" aria-hidden="true">
        <div className="glow glow-a" />
        <div className="glow glow-b" />
        <div className="glow glow-c" />
      </div>
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="brand-text">
            Retro<span className="brand-dot">.</span>
          </span>
        </Link>
        {onBoard && (
          <Link to="/" className="btn btn-ghost btn-sm">
            ← All boards
          </Link>
        )}
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
