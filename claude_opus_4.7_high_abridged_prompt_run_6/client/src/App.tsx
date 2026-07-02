import { Routes, Route, Link, useLocation } from 'react-router-dom';
import MainPage from './pages/MainPage';
import BoardPage from './pages/BoardPage';

export default function App() {
  const location = useLocation();
  const isBoard = location.pathname.startsWith('/board/');

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">
            Reflect<span className="brand-dot">.</span>
          </span>
        </Link>
        <div className="header-meta">
          {isBoard ? (
            <Link to="/" className="ghost-btn">
              ← All boards
            </Link>
          ) : (
            <span className="header-tag">real-time • self-hosted</span>
          )}
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/board/:boardId" element={<BoardPage />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <span>Reflect · a self-hosted retrospective board</span>
      </footer>
    </div>
  );
}
