import { useEffect } from 'react';

const KIND_STYLES = {
  info: {},
  success: { color: '#a7f3d0', borderColor: 'rgba(52, 211, 153, 0.35)' },
  error: { color: '#fca5a5', borderColor: 'rgba(248, 113, 113, 0.45)' },
};

export default function Toast({ message, kind = 'info', onDismiss, duration = 2600 }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss?.(), duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  const style = KIND_STYLES[kind] || {};
  return (
    <div className="toast" style={style} onClick={onDismiss}>
      {message}
    </div>
  );
}
