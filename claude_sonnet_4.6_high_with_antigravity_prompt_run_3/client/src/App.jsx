import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import MainPage from './pages/MainPage';
import BoardPage from './pages/BoardPage';

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="navbar-brand-icon">⚡</div>
        <span>RetroBoard</span>
      </Link>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navbar />
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/board/:id" element={<BoardPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
