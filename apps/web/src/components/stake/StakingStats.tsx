import { MetricCard } from "@/components/shared/MetricCard";
import { JACK_DECIMALS, WETH_DECIMALS } from "@/lib/constants";
import { formatTimestamp, formatTokenAmount } from "@/lib/format";

export function StakingStats({
  ready,
  jackDecimals,
  walletJackBalance,
  stakedJack,
  totalStaked,
  rewardRate,
  periodFinish,
}: {
  ready: boolean;
  jackDecimals: number;
  walletJackBalance: bigint | undefined;
  stakedJack: bigint | undefined;
  totalStaked: bigint | undefined;
  rewardRate: bigint | undefined;
  periodFinish: bigint | undefined;
}) {
  const dash = "—";
  const sharePct =
    ready && stakedJack !== undefined && totalStaked !== undefined && totalStaked > 0n
      ? `${((Number(stakedJack) / Number(totalStaked)) * 100).toFixed(2)}%`
      : dash;

  const rewardRatePerDay =
    ready && rewardRate !== undefined ? formatTokenAmount(rewardRate * 86_400n, WETH_DECIMALS) : dash;

  const periodFinishActive = ready && periodFinish !== undefined && periodFinish > 0n;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <MetricCard label="Wallet JACK" value={ready ? formatTokenAmount(walletJackBalance, jackDecimals) : dash} />
      <MetricCard label="Your staked JACK" value={ready ? formatTokenAmount(stakedJack, jackDecimals) : dash} accent />
      <MetricCard label="Total staked" value={ready ? formatTokenAmount(totalStaked, JACK_DECIMALS) : dash} />
      <MetricCard label="Your pool share" value={sharePct} />
      <MetricCard label="WETH / day (current rate)" value={rewardRatePerDay} />
      <MetricCard
        label="Reward period finish"
        value={periodFinishActive ? formatTimestamp(periodFinish) : dash}
        hint={ready && periodFinishActive === false ? "No stream active" : undefined}
      />
    </div>
  );
}
