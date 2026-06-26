import { Routes, Route, Link, useLocation } from 'react-router-dom';
import MainPage from './pages/MainPage.jsx';
import BoardPage from './pages/BoardPage.jsx';

export default function App() {
  const location = useLocation();
  const onBoardPage = location.pathname.startsWith('/board/');

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Retro Board home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28">
              <defs>
                <linearGradient id="brandg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7c5cff" />
                  <stop offset="1" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <rect x="3" y="3" width="26" height="26" rx="7" fill="url(#brandg)" />
              <rect x="8" y="10" width="4" height="14" rx="1.5" fill="#fff" opacity=".9" />
              <rect x="14" y="10" width="4" height="10" rx="1.5" fill="#fff" opacity=".75" />
              <rect x="20" y="10" width="4" height="7" rx="1.5" fill="#fff" opacity=".55" />
            </svg>
          </span>
          <span className="brand-text">
            <span className="brand-name">Retro</span>
            <span className="brand-name-accent">Board</span>
          </span>
        </Link>
        {onBoardPage && (
          <Link to="/" className="topbar-link" id="back-to-boards">
            <span aria-hidden="true">←</span> All boards
          </Link>
        )}
      </header>

      <main className="page">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/board/:boardId" element={<BoardPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="footer">
        <span>Real-time retros · self-hosted · open source</span>
      </footer>
    </div>
  );
}

function NotFound() {
  return (
    <div className="empty-state">
      <h1>Lost in the void</h1>
      <p>That page doesn't exist. Try heading back to your boards.</p>
      <Link className="btn btn-primary" to="/">Go home</Link>
    </div>
  );
}
