import React from 'react';

function hashColor(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue1 = h % 360;
  const hue2 = (hue1 + 50 + (h % 60)) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 85% 62%), hsl(${hue2} 80% 60%))`;
}

export default function Avatar({ name, size = 22 }) {
  const initials = (name || 'G')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const style = {
    width: size,
    height: size,
    fontSize: Math.max(10, size * 0.45),
    background: hashColor(name || 'guest'),
  };
  return (
    <span className="avatar" style={style} title={name}>
      {initials}
    </span>
  );
}
