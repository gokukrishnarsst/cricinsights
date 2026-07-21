import { cn } from '@/lib/utils';

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-ink/[0.08]', className)}
      aria-hidden
    />
  );
}

export default function GenerativeSkeleton({
  variant = 'card',
  className,
}: {
  variant?: 'card' | 'wide' | 'table';
  className?: string;
}) {
  if (variant === 'wide') {
    return (
      <div
        className={cn(
          'space-y-4 rounded-2xl border border-line/60 bg-surface-2/40 p-6',
          className,
        )}
      >
        <Bone className="h-5 w-48" />
        <div className="flex justify-center gap-8">
          <Bone className="h-52 w-36 rounded-2xl" />
          <Bone className="h-8 w-12 self-center" />
          <Bone className="h-52 w-36 rounded-2xl" />
        </div>
        <Bone className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div
        className={cn(
          'space-y-2 rounded-xl border border-line/60 p-4',
          className,
        )}
      >
        <Bone className="mb-3 h-4 w-32" />
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('mx-auto max-w-[260px] space-y-3', className)}>
      <Bone className="mx-auto h-48 w-full rounded-2xl" />
      <Bone className="mx-auto h-4 w-3/4" />
      <Bone className="mx-auto h-3 w-1/2" />
    </div>
  );
}
