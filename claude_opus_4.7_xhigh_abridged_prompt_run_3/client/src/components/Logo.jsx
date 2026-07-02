export default function Logo({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="brand-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#brand-g)" />
      <path
        d="M18 20h12v8H18zM34 20h12v20H34zM18 32h12v12H18z"
        fill="#0b0b17"
        opacity="0.9"
      />
    </svg>
  );
}
