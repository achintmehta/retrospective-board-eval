import { Routes, Route, Navigate } from 'react-router-dom';
import MainPage from './pages/MainPage.jsx';
import BoardPage from './pages/BoardPage.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <div className="ambient-glow" aria-hidden="true" />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
