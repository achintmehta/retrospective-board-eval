import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BoardPage from './pages/BoardPage.jsx';

function AppShell({ children }) {
  const location = useLocation();
  const onHome = location.pathname === '/';
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand" id="brand-link">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-bar bar-1"></span>
            <span className="brand-bar bar-2"></span>
            <span className="brand-bar bar-3"></span>
          </span>
          <span className="brand-text">
            <span className="brand-name">Retro</span>
            <span className="brand-tag">realtime board</span>
          </span>
        </Link>
        {!onHome && (
          <Link to="/" className="ghost-button" id="back-home-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            All boards
          </Link>
        )}
      </header>
      <main className="app-main">{children}</main>
      <div className="app-glow" aria-hidden="true" />
    </div>
  );
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
