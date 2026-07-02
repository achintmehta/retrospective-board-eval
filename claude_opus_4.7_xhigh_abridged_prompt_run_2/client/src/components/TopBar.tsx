import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface TopBarProps {
  right?: ReactNode;
  center?: ReactNode;
}

export default function TopBar({ right, center }: TopBarProps) {
  return (
    <div className="top-bar">
      <Link to="/" className="brand" aria-label="Retro home">
        <span className="brand-mark" aria-hidden />
        <span>
          <span className="brand-name-gradient">Retro</span>
          <span className="text-tertiary" style={{ marginLeft: 6, fontWeight: 500 }}>
            board
          </span>
        </span>
      </Link>
      {center && <div className="flex center gap-3">{center}</div>}
      <div className="flex center gap-3">{right}</div>
    </div>
  );
}
