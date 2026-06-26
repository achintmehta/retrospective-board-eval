import { Outlet, Link } from 'react-router-dom';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          Retro<span>Board</span>
        </Link>
        <span className="tagline">Real-time team retrospectives</span>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
