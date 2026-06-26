import { authorColor, initials } from '../lib/time.js';

export default function Avatar({ name, size }) {
  const style = {
    background: authorColor(name),
    ...(size ? { width: size, height: size, fontSize: Math.round(size * 0.42) } : null)
  };
  return (
    <span className="avatar" style={style} title={name} aria-label={name}>
      {initials(name)}
    </span>
  );
}
