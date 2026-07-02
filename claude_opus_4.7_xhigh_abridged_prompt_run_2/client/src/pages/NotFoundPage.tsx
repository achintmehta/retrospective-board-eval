import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar';

export default function NotFoundPage() {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="container" style={{ padding: '80px 32px', textAlign: 'center' }}>
        <div className="fade-up">
          <div className="chip chip-gradient" style={{ marginBottom: 20 }}>404</div>
          <h1 className="mb-4">This page took a sabbatical.</h1>
          <p className="text-secondary" style={{ maxWidth: 460, margin: '0 auto 24px' }}>
            The board or page you were looking for isn't here. Head back and try again.
          </p>
          <Link to="/" className="btn btn-primary">
            Back to home
            <span aria-hidden>→</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
