import { Routes, Route } from 'react-router-dom'
import MainPage from './pages/MainPage.jsx'
import BoardPage from './pages/BoardPage.jsx'
import './App.css'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/board/:id" element={<BoardPage />} />
      </Routes>
    </div>
  )
}

export default App
