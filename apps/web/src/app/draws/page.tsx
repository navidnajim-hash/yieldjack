import { DrawHistoryTable } from "@/components/draws/DrawHistoryTable";

export default function DrawsPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Draw history</h1>
        <p className="mt-1 text-sm text-muted">
          Every round below is read live from <code>DemoPrizeEngine</code> — there are no
          invented winners or amounts.
        </p>
      </div>
      <DrawHistoryTable />
    </div>
  );
}
