import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import BoardPage from './pages/BoardPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/board/:boardId" element={<BoardPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
