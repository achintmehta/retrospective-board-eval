import { Link, Route, Routes } from 'react-router-dom';
import MainPage from './pages/MainPage.jsx';
import BoardPage from './pages/BoardPage.jsx';

function Topbar() {
  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="Retro home">
        <div className="brand-mark" aria-hidden="true">
          <span>R</span>
        </div>
        <div className="brand-name">Retro</div>
      </Link>
      <div className="topbar-actions">
        <a
          className="btn btn-ghost btn-sm"
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub repository"
        >
          Self-hosted · v1
        </a>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="app">
      <Topbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h2>Page not found</h2>
                <Link to="/" className="btn btn-primary">Back to boards</Link>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
