import type { ContractName } from "@yieldjack/config";
import { useChainId } from "wagmi";
import { getContractConfig } from "@/lib/contracts";

/** Resolves a contract's {address, abi} for the currently connected chain. */
export function useContract(name: ContractName) {
  const chainId = useChainId();
  return getContractConfig(chainId, name);
}
