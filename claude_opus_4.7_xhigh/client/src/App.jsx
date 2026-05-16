import { Link, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BoardPage from './pages/BoardPage.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">Retro Board</Link>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="page">
      <h2>Not found</h2>
      <p><Link to="/">Back to boards</Link></p>
    </div>
  );
}
