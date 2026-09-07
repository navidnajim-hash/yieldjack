const CONTROLS = [
  {
    title: "Withdrawals stay available during pause",
    body: "An administrative pause may only ever gate new deposits/stakes — never withdrawals, staking-reward claims, or exits.",
  },
  {
    title: "Principal never funds prizes",
    body: "Only realized yield can fund a prize. Principal and prize accounting are kept separate at the contract level.",
  },
  {
    title: "No admin-selected winners",
    body: "Winner selection is a pure function of on-chain randomness and a weight snapshot — no address can set or override it.",
  },
  {
    title: "Timelocked staking migration",
    body: "JackFeeRouter can only redirect the staker share to a new staking contract after a 7-day on-chain timelock.",
  },
  {
    title: "No arbitrary admin calls",
    body: "Neither JackFeeRouter nor JackStakingRewards exposes a generic/arbitrary-call admin function, and neither can reach a pending staker reward.",
  },
];

export function SecurityControls() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {CONTROLS.map((control) => (
        <div key={control.title} className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold text-foreground">{control.title}</h3>
          <p className="mt-2 text-sm text-muted">{control.body}</p>
        </div>
      ))}
    </div>
  );
}
