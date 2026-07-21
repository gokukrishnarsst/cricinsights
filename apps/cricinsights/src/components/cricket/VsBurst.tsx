export default function VsBurst({ size = 80 }: { size?: number }) {
  return (
    <div
      className="font-display relative flex items-center justify-center font-black"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        color: 'var(--color-accent-2)',
        textShadow: '0 0 24px rgba(34,211,238,.45)',
        animation: 'gf-score-tick .5s cubic-bezier(.16,1,.3,1) both',
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(34,211,238,.18) 0%, transparent 70%)',
        }}
      />
      VS
    </div>
  );
}
