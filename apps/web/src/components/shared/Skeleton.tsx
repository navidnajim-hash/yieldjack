export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-raised ${className}`} aria-hidden="true" />;
}

export function SkeletonMetricCard() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-28" />
    </div>
  );
}
