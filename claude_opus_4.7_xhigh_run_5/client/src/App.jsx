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
          <Route path="/boards/:id" element={<BoardPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="centered">
      <h2>Page not found</h2>
      <Link to="/">Back to boards</Link>
    </div>
  );
}
