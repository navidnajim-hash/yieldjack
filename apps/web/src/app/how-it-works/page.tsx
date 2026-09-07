export default function HowItWorksPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">How YieldJack works</h1>
        <p className="mt-2 text-muted">
          A prize-savings model: your principal never leaves your control, and only the yield it
          generates funds the prize.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-primary">1. Deposit</h2>
        <p className="text-sm text-muted">
          Connect a wallet on Robinhood Chain Testnet, claim Mock USDG from the faucet, approve
          the <code>YieldJackVault</code> contract, and deposit. Your deposit is tracked as
          principal you can withdraw at any time — no lock-up.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-primary">2. Yield accrues, weighted by time</h2>
        <p className="text-sm text-muted">
          Deposited capital is routed into a yield source. In this testnet MVP that source is a
          mock ERC-4626 vault whose yield is simulated on-chain (never faked in the frontend).
          Your eligibility for the current round&apos;s draw is a function of both how much you
          deposited and how long you held it during the round — a deposit made moments before
          the draw closes carries far less weight than the same deposit held the whole round.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-primary">3. A round closes and a winner is drawn</h2>
        <p className="text-sm text-muted">
          Once a round&apos;s duration elapses, anyone can permissionlessly close it. Realized
          yield (never principal) becomes that round&apos;s prize. On-chain randomness is
          requested and, once revealed, deterministically maps to a winner weighted by
          eligibility — no administrator selects or can override the outcome.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-primary">4. The winner claims</h2>
        <p className="text-sm text-muted">
          The selected winner claims the prize directly from the contract within the claim
          window. If unclaimed, the prize rolls forward into a future round rather than being
          lost.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gold">$JACK sponsorship</h2>
        <p className="text-sm text-muted">
          Anyone can add a bonus prize to the current round by supplying Mock USDG and burning a
          configurable amount of Mock JACK. This never changes anyone&apos;s base odds — it only
          grows the pot.
        </p>
      </section>

      <section className="rounded-xl border border-gold/40 bg-gold/5 p-5">
        <h2 className="text-sm font-semibold text-gold">Testnet limitations</h2>
        <p className="mt-2 text-sm text-muted">
          This is an unaudited testnet MVP. The yield source, randomness, and every token here
          are mocks with no real value. See the{" "}
          <a href="/transparency" className="text-primary underline">
            Transparency page
          </a>{" "}
          for the full list of what changes before production.
        </p>
      </section>
    </div>
  );
}
