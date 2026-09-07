import type { ReactNode } from "react";

export function PrelaunchNotice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-muted">{children}</p>
  );
}
