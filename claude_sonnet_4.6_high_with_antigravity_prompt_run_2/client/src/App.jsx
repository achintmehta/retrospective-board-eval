import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Link } from 'react-router-dom'
import MainPage from './pages/MainPage'
import BoardPage from './pages/BoardPage'

function Nav() {
  return (
    <nav className="app-nav">
      <Link to="/" className="app-nav-logo">RetroBoard</Link>
    </nav>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/board/:id" element={<BoardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
