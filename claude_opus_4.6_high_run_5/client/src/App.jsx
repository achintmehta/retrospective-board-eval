import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import MainPage from './pages/MainPage';
import BoardPage from './pages/BoardPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <Link to="/">
          <h1>Retro Board</h1>
        </Link>
      </header>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/boards/:id" element={<BoardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
