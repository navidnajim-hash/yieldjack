import Link from "next/link";
import { MetricCard } from "@/components/shared/MetricCard";
import { SectionHeader } from "@/components/shared/SectionHeader";

export function CurrentRoundPreview() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader eyebrow="Draws" title="Current round" />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Prize amount" value="—" hint="Available at launch" />
        <MetricCard label="Round state" value="—" hint="Available at launch" />
        <MetricCard label="Time remaining" value="—" hint="Available at launch" />
      </div>
      <Link href="/draws" className="self-start text-sm font-semibold text-accent hover:text-accent-hover">
        View draws →
      </Link>
    </div>
  );
}
