import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import TopBar from './components/TopBar.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <TopBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
