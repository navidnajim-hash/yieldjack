export interface DeployedContract {
  address: `0x${string}` | null;
  blockNumber: number | null;
}

export const CONTRACT_NAMES = [
  "MockUSDG",
  "MockJACK",
  "MockYieldSource",
  "DemoRandomnessProvider",
  "YieldJackVault",
  "DemoPrizeEngine",
  "SponsorRegistry",
] as const;

export type ContractName = (typeof CONTRACT_NAMES)[number];

export type DeploymentContracts = Record<ContractName, DeployedContract>;

export interface DeploymentManifest {
  chainId: number;
  name: string;
  /** ISO timestamp of the deployment, or null if this manifest is an un-deployed placeholder. */
  deployedAt: string | null;
  contracts: DeploymentContracts;
}

export function emptyDeploymentManifest(chainId: number, name: string): DeploymentManifest {
  const contracts = Object.fromEntries(
    CONTRACT_NAMES.map((n) => [n, { address: null, blockNumber: null }]),
  ) as DeploymentContracts;
  return { chainId, name, deployedAt: null, contracts };
}

/** True when every contract in the manifest has a real deployed address. */
export function isFullyDeployed(manifest: DeploymentManifest): boolean {
  return CONTRACT_NAMES.every((n) => manifest.contracts[n].address !== null);
}

export function getContractAddress(manifest: DeploymentManifest, name: ContractName): `0x${string}` | null {
  return manifest.contracts[name].address;
}
