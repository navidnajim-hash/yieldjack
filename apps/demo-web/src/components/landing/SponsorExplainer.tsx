export function SponsorExplainer() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="text-sm font-semibold text-gold">$JACK sponsored rounds</h3>
      <p className="mt-2 text-sm text-muted">
        Anyone can sponsor a round: fund a bonus prize in Mock USDG and burn a configurable
        amount of Mock JACK to create the sponsorship. The bonus is added straight to that
        round&apos;s prize pool. Sponsoring is deliberately separate from odds — it never buys
        the sponsor, or JACK holders generally, a better chance of winning.
      </p>
      <p className="mt-2 text-xs text-muted">
        Mock JACK is not the real $JACK token. The production token address will be configured
        after launch — see the Transparency page.
      </p>
    </div>
  );
}
