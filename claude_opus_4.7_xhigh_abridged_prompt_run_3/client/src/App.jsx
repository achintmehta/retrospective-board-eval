import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import MainPage from './pages/MainPage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import Logo from './components/Logo.jsx';

export default function App() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <div className="app-bg" aria-hidden="true">
        <div className="app-bg__aurora app-bg__aurora--a" />
        <div className="app-bg__aurora app-bg__aurora--b" />
        <div className="app-bg__aurora app-bg__aurora--c" />
        <div className="app-bg__grid" />
      </div>

      <header className="app-header">
        <Link to="/" className="app-header__brand">
          <Logo />
          <div className="app-header__title">
            <span className="app-header__name">Retro</span>
            <span className="app-header__tag">real-time retrospective boards</span>
          </div>
        </Link>
        <nav className="app-header__nav">
          <a
            className="app-header__link"
            href="https://socket.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            realtime
          </a>
          <a
            className="app-header__link"
            href="https://sqlite.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            sqlite
          </a>
        </nav>
      </header>

      <main className="app-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="app-main__inner"
          >
            <Routes location={location}>
              <Route path="/" element={<MainPage />} />
              <Route path="/boards/:boardId" element={<BoardPage />} />
              <Route path="*" element={<MainPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="app-footer">
        <span>Self-hosted retrospectives · v1.0</span>
      </footer>
    </div>
  );
}
