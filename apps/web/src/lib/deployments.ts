import anvilDeployment from "../../../../deployments/31337.json";
import testnetDeployment from "../../../../deployments/46630.json";
import type { DeploymentManifest } from "@yieldjack/config";
import { ANVIL_CHAIN_ID, robinhoodChainTestnet } from "@yieldjack/config";

const manifestsByChainId: Record<number, DeploymentManifest> = {
  [ANVIL_CHAIN_ID]: anvilDeployment as DeploymentManifest,
  [robinhoodChainTestnet.id]: testnetDeployment as DeploymentManifest,
};

export function getDeploymentManifest(chainId: number | undefined): DeploymentManifest | undefined {
  if (chainId === undefined) return undefined;
  return manifestsByChainId[chainId];
}
