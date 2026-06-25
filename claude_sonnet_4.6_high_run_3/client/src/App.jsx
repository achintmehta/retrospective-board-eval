import { Routes, Route } from 'react-router-dom'
import MainPage from './pages/MainPage.jsx'
import BoardPage from './pages/BoardPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/board/:id" element={<BoardPage />} />
    </Routes>
  )
}
