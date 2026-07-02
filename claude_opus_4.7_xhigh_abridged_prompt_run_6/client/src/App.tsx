import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { BoardPage } from './pages/BoardPage';

function Header() {
  const navigate = useNavigate();
  return (
    <header className="site-header">
      <button
        type="button"
        className="brand"
        onClick={() => navigate('/')}
        aria-label="Go to home"
      >
        <span className="brand-mark" aria-hidden />
        <span className="brand-name">
          Retro<span className="brand-dot">.</span>
        </span>
      </button>
      <nav>
        <Link to="/" className="nav-link">
          Boards
        </Link>
      </nav>
    </header>
  );
}

export function App() {
  return (
    <div className="app-shell">
      <div className="bg-orbs" aria-hidden>
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/boards/:id" element={<BoardPage />} />
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h2>Nothing here.</h2>
                <Link to="/" className="btn btn-primary">
                  Back to boards
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
