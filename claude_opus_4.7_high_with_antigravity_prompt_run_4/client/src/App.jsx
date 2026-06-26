import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import { ToastProvider } from './components/Toast.jsx';

function TopBar() {
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link to="/" className="brand" id="brand-link">
          <span className="brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="5" height="14" rx="1.5" fill="#0a0d24"/>
              <rect x="10" y="5" width="5" height="10" rx="1.5" fill="#0a0d24"/>
              <rect x="17" y="5" width="4" height="6" rx="1.5" fill="#0a0d24"/>
            </svg>
          </span>
          <span>
            <span className="brand-name">Retro</span>{' '}
            <span className="brand-tag">/ realtime board</span>
          </span>
        </Link>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <div className="app-shell">
        <TopBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/boards/:id" element={<BoardPage />} />
          <Route path="*" element={
            <div className="center-fill">
              <p>Nothing here. <Link to="/" style={{ color: 'var(--accent-2)' }}>Back home →</Link></p>
            </div>
          } />
        </Routes>
      </div>
    </ToastProvider>
  );
}
