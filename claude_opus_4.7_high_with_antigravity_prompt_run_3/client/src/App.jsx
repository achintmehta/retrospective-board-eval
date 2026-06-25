import { Outlet, Link, useLocation } from 'react-router-dom';

export default function App() {
  const location = useLocation();
  const onBoard = location.pathname.startsWith('/boards/');

  return (
    <div className="app-shell">
      <div className="aurora" aria-hidden="true">
        <div className="aurora__blob aurora__blob--violet" />
        <div className="aurora__blob aurora__blob--pink" />
        <div className="aurora__blob aurora__blob--gold" />
      </div>

      <header className="app-header">
        <Link to="/" className="brand" aria-label="Prism home">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28">
              <defs>
                <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="50%" stopColor="#f472b6" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
              <path
                d="M8 11 L16 5 L24 11 L24 21 L16 27 L8 21 Z"
                fill="none"
                stroke="url(#brandGrad)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <circle cx="16" cy="16" r="2.6" fill="url(#brandGrad)" />
            </svg>
          </span>
          <span className="brand__name">Prism</span>
          <span className="brand__tag">Retro</span>
        </Link>

        {onBoard && (
          <Link to="/" className="btn btn--ghost">
            <ArrowLeft />
            All boards
          </Link>
        )}
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <span>Real-time retrospectives · self-hosted · zero setup</span>
      </footer>
    </div>
  );
}

function ArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}
