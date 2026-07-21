import { cn } from '@/lib/utils';

/** Cricket ball loading indicator (seam spin). */
export function CricketBallSpinner({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-flex animate-seam-spin', className)}
      role="status"
      aria-label="Loading"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        aria-hidden
      >
        <circle cx="16" cy="16" r="14" fill="#c41e1e" />
        <path
          d="M8 10c4 6 12 6 16 0M8 22c4-6 12-6 16 0"
          stroke="#f5f5f0"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
