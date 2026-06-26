import { Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  const location = useLocation();
  const onHome = location.pathname === '/';

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand" aria-label="RetroFlow home">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-mark-bar" />
            <span className="brand-mark-bar" />
            <span className="brand-mark-bar" />
          </span>
          <span className="brand-text">
            <span className="brand-text-main">RetroFlow</span>
            <span className="brand-text-sub">real-time retrospectives</span>
          </span>
        </Link>
        {!onHome && (
          <Link to="/" className="btn btn-ghost btn-sm" id="nav-home">
            ← All boards
          </Link>
        )}
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <span>
          Built for honest retrospectives. Self-hosted, real-time, and yours to keep.
        </span>
      </footer>
    </div>
  );
}
