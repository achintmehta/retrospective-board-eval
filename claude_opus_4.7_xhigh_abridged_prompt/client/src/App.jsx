import { Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { ToastProvider } from './components/Toast.jsx';
import IdentityChip from './components/IdentityChip.jsx';

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="7" height="16" rx="1.5" />
      <rect x="14" y="4" width="7" height="10" rx="1.5" />
    </svg>
  );
}

function AppHeader() {
  const location = useLocation();
  const onBoard = location.pathname.startsWith('/board/');
  return (
    <header className="app-header">
      <Link to="/" className="brand" aria-label="Retro home">
        <span className="brand-logo"><LogoMark /></span>
        <span className="brand-title">Retro</span>
      </Link>
      <div className="header-actions">
        {onBoard ? null : <span className="identity-chip"><span className="identity-dot" /> Live sync ready</span>}
        <IdentityChip />
      </div>
    </header>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <div className="app-shell">
        <AppHeader />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/board/:id" element={<BoardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </ToastProvider>
  );
}
