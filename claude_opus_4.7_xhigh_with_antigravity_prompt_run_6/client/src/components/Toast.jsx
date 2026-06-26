import { useEffect } from 'react';

export default function Toast({ message, kind = 'info', onClose, duration = 3200 }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast ${kind === 'error' ? 'error' : ''}`} role="status" id="toast">
      {message}
    </div>
  );
}
