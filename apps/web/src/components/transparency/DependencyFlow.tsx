const EDGES = [
  { from: "Production asset", to: "Production vault", detail: "Deposited & custodied" },
  { from: "Production vault", to: "Production prize engine", detail: "Realized yield only, never principal" },
  { from: "JACK token", to: "JackFeeRouter", detail: "Registered as creatorFeeRecipient" },
  { from: "JackFeeRouter", to: "JackStakingRewards", detail: "70% of each harvest" },
  { from: "JackFeeRouter", to: "Prize reserve", detail: "20% of each harvest" },
];

export function DependencyFlow() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
      {EDGES.map((edge) => (
        <div key={`${edge.from}-${edge.to}`} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md border border-border px-2.5 py-1 font-mono text-xs text-foreground">
            {edge.from}
          </span>
          <span className="text-muted-dim">→</span>
          <span className="rounded-md border border-border px-2.5 py-1 font-mono text-xs text-foreground">
            {edge.to}
          </span>
          <span className="text-xs text-muted">{edge.detail}</span>
        </div>
      ))}
    </div>
  );
}
