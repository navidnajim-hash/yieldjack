const STEPS = [
  {
    title: "1. Deposit Mock USDG",
    body: "Connect a wallet, grab test tokens from the faucet, and deposit into the YieldJackVault. Your principal is tracked precisely and stays withdrawable.",
  },
  {
    title: "2. Yield builds the prize",
    body: "Deposited capital is routed into a yield source. Realized yield — never your principal — accumulates into the round's prize pool.",
  },
  {
    title: "3. One eligible saver wins",
    body: "When a round closes, on-chain randomness selects a winner weighted by how much you deposited and how long you held it. The winner claims the prize; everyone keeps their principal.",
  },
];

export function ThreeSteps() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-center text-2xl font-semibold text-foreground">How a round works</h2>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.title} className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-base font-semibold text-primary">{step.title}</h3>
            <p className="mt-2 text-sm text-muted">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
