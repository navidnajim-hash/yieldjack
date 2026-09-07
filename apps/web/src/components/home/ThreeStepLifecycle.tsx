import { SectionHeader } from "@/components/shared/SectionHeader";

const STEPS = [
  {
    step: "01",
    title: "Deposit",
    body: "Deposit the supported savings asset into the vault. Your principal is tracked to your wallet from that moment on.",
  },
  {
    step: "02",
    title: "Yield accrues",
    body: "The vault routes pooled deposits into a verified yield source. Realized yield — never principal — builds toward the round's prize.",
  },
  {
    step: "03",
    title: "Draw or withdraw",
    body: "When a round closes, one eligible depositor is drawn to win the accrued prize. Withdraw your principal according to the production contracts, any time.",
  },
];

export function ThreeStepLifecycle() {
  return (
    <div className="flex flex-col gap-10">
      <SectionHeader
        eyebrow="How saving works"
        title="Three steps, every round"
        description="The same lifecycle repeats every round: deposit, let yield accrue, then a winner is drawn while everyone keeps their principal."
      />
      <div className="grid gap-6 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.step} className="rounded-xl border border-border bg-surface p-5">
            <span className="font-mono text-sm text-accent">{s.step}</span>
            <h3 className="mt-2 text-base font-semibold text-foreground">{s.title}</h3>
            <p className="mt-2 text-sm text-muted">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
