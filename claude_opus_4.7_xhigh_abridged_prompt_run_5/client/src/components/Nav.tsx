import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export function Nav({ right }: { right?: ReactNode }) {
  return (
    <nav className="nav">
      <Link to="/" className="brand" aria-label="Retro home">
        <span className="brand-mark">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="3" y="6" width="4" height="12" rx="1.2" fill="white" />
            <rect x="10" y="6" width="4" height="8" rx="1.2" fill="white" opacity="0.85" />
            <rect x="17" y="6" width="4" height="5" rx="1.2" fill="white" opacity="0.65" />
          </svg>
        </span>
        <span>Retro</span>
      </Link>
      <div className="nav-right">{right}</div>
    </nav>
  );
}
