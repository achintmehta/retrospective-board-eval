import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BoardPage from './pages/BoardPage';

function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <Link to="/" className="app-logo">
          <span className="app-logo-icon">R</span>
          <span>Retro Board</span>
        </Link>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/board/:id" element={<BoardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
