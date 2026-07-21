export function CricketBallIcon({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" fill="#c45c26" stroke="#8b3a1a" strokeWidth="1.2" />
      <path
        d="M12 2 C8 6 8 18 12 22 M12 2 C16 6 16 18 12 22"
        fill="none"
        stroke="#f5e6d3"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M4 8 C7 10 7 14 4 16 M20 8 C17 10 17 14 20 16"
        fill="none"
        stroke="#f5e6d3"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}
