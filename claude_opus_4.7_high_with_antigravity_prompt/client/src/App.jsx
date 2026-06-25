import { Routes, Route, Link, useLocation } from 'react-router-dom';
import MainPage from './pages/MainPage.jsx';
import BoardPage from './pages/BoardPage.jsx';

export default function App() {
  const location = useLocation();
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Retroflow</span>
        </Link>
        <nav className="app-nav">
          <a href="https://socket.io" target="_blank" rel="noreferrer" className="nav-link">
            Real-time
          </a>
          <span className={`route-pill ${location.pathname === '/' ? 'route-pill--active' : ''}`}>
            {location.pathname === '/' ? 'Boards' : 'Live Board'}
          </span>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/board/:id" element={<BoardPage />} />
        </Routes>
      </main>
    </div>
  );
}
