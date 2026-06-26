import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        textAlign: 'center',
        padding: '80px 24px',
        minHeight: 'calc(100vh - 80px)',
      }}
    >
      <span className="badge">404</span>
      <h1>Lost in the retro void.</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: 420 }}>
        The page you’re looking for doesn’t exist, or the board was archived.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to boards
      </Link>
    </div>
  );
}
