import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="container">
      <div className="empty" style={{ padding: '80px 24px' }}>
        <h2 style={{ fontSize: 28, marginBottom: 10 }}>Not found</h2>
        <p style={{ marginBottom: 20 }}>The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn btn-primary">Back to boards</Link>
      </div>
    </main>
  );
}
