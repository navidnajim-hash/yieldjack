import type { ReactNode } from "react";
import { LoadingSkeleton } from "@/components/shared/EmptyState";

export function StatCard({
  label,
  value,
  isLoading,
  hint,
  accent,
  className,
}: {
  label: string;
  value: ReactNode;
  isLoading?: boolean;
  hint?: string;
  accent?: "primary" | "gold";
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-4 ${className ?? ""}`}>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      {isLoading ? (
        <LoadingSkeleton className="mt-2 h-7 w-20" />
      ) : (
        <p
          className={`mt-1 animate-yj-roll text-2xl font-semibold ${
            accent === "primary" ? "text-primary" : accent === "gold" ? "text-gold" : "text-foreground"
          }`}
        >
          {value}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
