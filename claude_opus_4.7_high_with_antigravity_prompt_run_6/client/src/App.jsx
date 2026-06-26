import { Routes, Route, Link } from 'react-router-dom';
import MainPage from './pages/MainPage.jsx';
import BoardPage from './pages/BoardPage.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">◇</span>
          <span className="brand-text">RetroBoard</span>
        </Link>
        <span className="brand-tag">real-time team retrospectives</span>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
        </Routes>
      </main>
    </div>
  );
}
