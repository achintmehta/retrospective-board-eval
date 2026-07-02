import { Link, Route, Routes } from 'react-router-dom';
import MainPage from './pages/MainPage';
import BoardPage from './pages/BoardPage';

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden>◐</span>
          <span className="brand-text">
            <span className="brand-title">Retro</span>
            <span className="brand-sub">real-time retrospectives</span>
          </span>
        </Link>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="empty-state">
      <h2>404</h2>
      <p>That board doesn’t exist yet.</p>
      <Link to="/" className="btn btn-primary">Back to boards</Link>
    </div>
  );
}
