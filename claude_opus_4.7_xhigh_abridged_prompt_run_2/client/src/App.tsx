import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BoardPage from './pages/BoardPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/boards/:id" element={<BoardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
