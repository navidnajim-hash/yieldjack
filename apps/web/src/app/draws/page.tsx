import { CurrentRoundCard } from "@/components/draws/CurrentRoundCard";
import { DrawHistoryList } from "@/components/draws/DrawHistoryList";
import { PageSection, PageShell } from "@/components/shared/PageShell";
import { SectionHeader } from "@/components/shared/SectionHeader";

export const metadata = {
  title: "Draws | YieldJack",
  description: "The current YieldJack prize round and the full history of past winners.",
};

export default function DrawsPage() {
  return (
    <PageShell>
      <PageSection className="flex flex-col gap-10">
        <SectionHeader
          eyebrow="Draws"
          title="Rounds & winners"
          description="Every round's prize, state, and — once finalized — winner, linked to its on-chain transaction."
        />
        <CurrentRoundCard />
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-foreground">Draw history</h3>
          <DrawHistoryList />
        </div>
      </PageSection>
    </PageShell>
  );
}
