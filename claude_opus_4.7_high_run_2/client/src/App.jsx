import { Routes, Route, Link } from 'react-router-dom';
import MainPage from './pages/MainPage.jsx';
import BoardPage from './pages/BoardPage.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="app-title">Retro Board</Link>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route path="*" element={<div className="empty">Not found.</div>} />
        </Routes>
      </main>
    </div>
  );
}
