import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import BoardPage from './pages/BoardPage';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/board/:id" element={<BoardPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
