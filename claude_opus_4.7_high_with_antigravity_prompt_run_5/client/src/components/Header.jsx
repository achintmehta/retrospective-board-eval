import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getDisplayName, initials } from '../lib/session.js';

export default function Header() {
  const [name, setName] = useState(getDisplayName());

  useEffect(() => {
    const onStorage = () => setName(getDisplayName());
    window.addEventListener('storage', onStorage);
    const interval = setInterval(onStorage, 1500);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="app-header" id="app-header">
      <Link to="/" className="brand" id="brand-link">
        <span className="brand-logo" aria-hidden="true">RB</span>
        <span>Retro<span className="gradient-text">Board</span></span>
      </Link>
      <div className="header-actions">
        <a
          className="btn btn-ghost btn-sm"
          href="https://github.com/"
          target="_blank"
          rel="noopener noreferrer"
          id="docs-link"
        >
          Docs
        </a>
        {name && (
          <div className="user-pill" id="user-pill">
            <span className="avatar" aria-hidden="true">{initials(name)}</span>
            <span>{name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
