import Link from "next/link";
import { MetricCard } from "@/components/shared/MetricCard";
import { prizeSavingsReadiness } from "@/lib/production/resolver";

export function Hero() {
  const live = prizeSavingsReadiness.configured;

  return (
    <div className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14">
      <div className="flex flex-col items-start gap-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          Built for Robinhood Chain
        </span>

        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Save. Earn. <span className="text-accent">Someone wins.</span>
        </h1>

        <p className="max-w-xl text-lg text-muted">
          YieldJack pools savings, puts the deposits to work, and turns the yield they generate into
          recurring prizes — while every saver keeps their own tracked principal. $JACK stakers earn a
          share of YieldJack&apos;s creator-fee revenue on top.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/app"
            className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Open app
          </Link>
          <Link
            href="/jack"
            className="rounded-lg border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
          >
            Explore JACK
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[0_0_60px_-30px_rgba(221,254,76,0.35)] sm:p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted">Save & Win</span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              live ? "bg-accent/15 text-accent" : "border border-border text-muted"
            }`}
          >
            {live ? "Live" : "Available at launch"}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <MetricCard label="Current prize" value="—" />
          <MetricCard label="Round" value="—" />
          <MetricCard label="Your deposit" value="—" />
          <MetricCard label="JACK rewards" value="—" />
        </div>

        <p className="mt-4 text-xs text-muted-dim">
          Figures populate once the production vault and prize engine are deployed — see{" "}
          <Link href="/transparency" className="text-accent hover:text-accent-hover">
            Transparency
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
