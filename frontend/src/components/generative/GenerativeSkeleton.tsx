import { Skeleton } from "@/components/ui/skeleton";

export default function GenerativeSkeleton({ variant = "card" }: { variant?: "card" | "wide" | "table" }) {
  if (variant === "wide") {
    return (
      <div className="space-y-4 rounded-2xl border border-line/60 bg-surface-2/40 p-6">
        <Skeleton className="h-5 w-48" />
        <div className="flex justify-center gap-8">
          <Skeleton className="h-52 w-36 rounded-2xl" />
          <Skeleton className="h-8 w-12 self-center" />
          <Skeleton className="h-52 w-36 rounded-2xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="space-y-2 rounded-xl border border-line/60 p-4">
        <Skeleton className="mb-3 h-4 w-32" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[260px] space-y-3">
      <Skeleton className="mx-auto h-48 w-full rounded-2xl" />
      <Skeleton className="h-4 w-3/4 mx-auto" />
      <Skeleton className="h-3 w-1/2 mx-auto" />
    </div>
  );
}
