import { ContractStatusRow } from "@/components/shared/ContractStatus";
import type { ProductionContracts } from "@/lib/production/resolver";

const REGISTRY: { key: keyof ProductionContracts; name: string; description: string }[] = [
  { key: "jackToken", name: "JACK token", description: "The real $JACK ERC-20 token." },
  {
    key: "jackFeeRouter",
    name: "JackFeeRouter",
    description: "Harvests creator-fee revenue and splits it 70/20/10.",
  },
  {
    key: "jackStakingRewards",
    name: "JackStakingRewards",
    description: "Holds staked JACK and streams WETH rewards.",
  },
  { key: "prizeReserve", name: "Prize reserve", description: "Receives the 20% prize-reserve share of revenue." },
  { key: "productionVault", name: "Production vault", description: "Custodies deposits and tracks principal." },
  {
    key: "productionPrizeEngine",
    name: "Production prize engine",
    description: "Runs the recurring draw lifecycle.",
  },
  { key: "productionAsset", name: "Production savings asset", description: "The token deposited into the vault." },
];

export function ContractRegistry({ contracts }: { contracts: ProductionContracts }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-5">
      {REGISTRY.map((entry) => (
        <ContractStatusRow
          key={entry.key}
          name={entry.name}
          description={entry.description}
          address={contracts[entry.key]}
        />
      ))}
    </div>
  );
}
