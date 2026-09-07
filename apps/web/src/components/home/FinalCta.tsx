import Link from "next/link";

export function FinalCta() {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-accent/25 bg-gradient-to-b from-accent/10 to-transparent px-6 py-14 text-center">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Save with YieldJack. Someone wins every round.
      </h2>
      <p className="max-w-md text-sm text-muted">
        Open the app to see your position, or explore what staking $JACK earns.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/app"
          className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          Open app
        </Link>
        <Link
          href="/stake"
          className="rounded-lg border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
        >
          Stake JACK
        </Link>
      </div>
    </div>
  );
}
