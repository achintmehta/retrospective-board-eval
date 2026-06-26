import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <h1 className="gradient-text">404</h1>
      <p>The board or page you were looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary">
        ← Back to boards
      </Link>
    </div>
  );
}
