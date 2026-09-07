import { EmptyState } from "@/components/shared/EmptyState";

export function RecentActivity() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <h3 className="text-base font-semibold text-foreground">Recent activity</h3>
      <EmptyState
        title="No activity yet"
        description="Your deposits, withdrawals, and claims will appear here, each linked to its transaction on the explorer."
      />
    </div>
  );
}
