const palettes = ['', 'warm', 'cool'];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, size }: { name: string; size?: number }) {
  const initial = (name || '?').trim().charAt(0) || '?';
  const palette = palettes[hash(name) % palettes.length];
  const style = size
    ? { width: size, height: size, fontSize: Math.round(size * 0.5) }
    : undefined;
  return (
    <span className={`avatar ${palette}`} style={style} title={name}>
      {initial}
    </span>
  );
}
