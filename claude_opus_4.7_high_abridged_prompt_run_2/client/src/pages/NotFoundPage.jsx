import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main
      style={{
        minHeight: '70vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div>
        <h1
          className="gradient-text"
          style={{ fontFamily: 'Outfit, Inter, sans-serif', fontSize: '6rem', margin: 0 }}
        >
          404
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.6rem' }}>
          We couldn't find that page.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to home
        </Link>
      </div>
    </main>
  );
}
