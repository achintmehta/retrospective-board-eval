import { Routes, Route, Link, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import { ToasterProvider } from './components/Toaster.jsx';

export default function App() {
  return (
    <ToasterProvider>
      <div className="app-shell">
        <header className="app-header" id="app-header">
          <Link to="/" className="brand" aria-label="Retro home">
            <span className="brand-mark" aria-hidden="true">R</span>
            <span className="brand-name">Retro</span>
            <span className="brand-tag">real-time</span>
          </Link>
          <nav className="row" aria-label="Primary">
            <NavLink to="/" end className={({ isActive }) => `btn btn-ghost btn-sm${isActive ? ' is-active' : ''}`}>
              Boards
            </NavLink>
            <a
              className="btn btn-ghost btn-sm"
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              title="Self-hosted retrospectives"
            >
              About
            </a>
          </nav>
        </header>
        <main className="app-main" id="main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/boards/:id" element={<BoardPage />} />
            <Route
              path="*"
              element={
                <div className="center-state">
                  <div>
                    <h2>Page not found</h2>
                    <p className="muted">Try heading <Link to="/">home</Link>.</p>
                  </div>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </ToasterProvider>
  );
}
