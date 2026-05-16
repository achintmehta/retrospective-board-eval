import { Routes, Route } from 'react-router-dom'
import MainPage from './pages/MainPage'
import BoardPage from './pages/BoardPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/board/:boardId" element={<BoardPage />} />
    </Routes>
  )
}
