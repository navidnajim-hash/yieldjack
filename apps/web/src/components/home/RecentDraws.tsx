import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";

export function RecentDraws() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader eyebrow="History" title="Recent draws" />
      <EmptyState
        title="No draws yet"
        description="Winner and prize history will appear here once the production prize engine has run its first round."
      />
    </div>
  );
}
