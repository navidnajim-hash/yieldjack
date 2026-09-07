import {
  DemoPrizeEngineAbi,
  DemoRandomnessProviderAbi,
  MockJACKAbi,
  MockUSDGAbi,
  MockYieldSourceAbi,
  SponsorRegistryAbi,
  YieldJackVaultAbi,
  type ContractName,
} from "@yieldjack/config";
import { getDeploymentManifest } from "./deployments";

const ABIS = {
  MockUSDG: MockUSDGAbi,
  MockJACK: MockJACKAbi,
  MockYieldSource: MockYieldSourceAbi,
  DemoRandomnessProvider: DemoRandomnessProviderAbi,
  YieldJackVault: YieldJackVaultAbi,
  DemoPrizeEngine: DemoPrizeEngineAbi,
  SponsorRegistry: SponsorRegistryAbi,
} as const;

export interface ContractConfig {
  address: `0x${string}`;
  abi: (typeof ABIS)[ContractName];
}

/**
 * Resolves a contract's address + ABI for the given chain from the deployment manifest.
 * Returns undefined when the chain has no deployment yet (or none for that contract) —
 * callers must handle this as a genuine "not deployed" state, never fall back to a guessed
 * address.
 */
export function getContractConfig(chainId: number | undefined, name: ContractName): ContractConfig | undefined {
  const manifest = getDeploymentManifest(chainId);
  const address = manifest?.contracts[name]?.address;
  if (!address) return undefined;
  return { address, abi: ABIS[name] };
}
