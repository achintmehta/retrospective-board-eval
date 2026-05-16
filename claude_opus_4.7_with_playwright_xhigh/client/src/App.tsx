import { Link, Route, Routes } from 'react-router-dom';
import MainPage from './pages/MainPage';
import BoardPage from './pages/BoardPage';

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-title">
          Retro Board
        </Link>
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
