import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(16,185,129,0.25), transparent), radial-gradient(ellipse 40% 40% at 85% 10%, rgba(232,185,63,0.15), transparent)",
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28">
        <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
          Robinhood Chain Testnet · Unaudited demo
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
          Save. Earn. <span className="text-primary">Someone wins.</span>
        </h1>
        <p className="max-w-2xl text-balance text-lg text-muted">
          Deposit Mock USDG into YieldJack. The capital generates yield behind the scenes, and
          that yield funds a recurring prize — while your principal stays yours, withdrawable at
          any time.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/app"
            className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-primary-hover"
          >
            Enter YieldJack
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-md border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
          >
            See How It Works
          </Link>
        </div>
      </div>
    </section>
  );
}
