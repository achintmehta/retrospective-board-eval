import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BoardPage from './pages/BoardPage.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden>◈</span>
          <span className="brand-name">Retro</span>
          <span className="brand-tag">realtime board</span>
        </Link>
        <a
          className="header-link"
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
        >
          Self-hosted · Zero setup
        </a>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
        </Routes>
      </main>
    </div>
  );
}
