import { useCallback, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Abi } from "viem";

export type TxPhase = "idle" | "signing" | "confirming" | "success" | "error";

/**
 * Wraps wagmi's write + wait-for-receipt flow into one clear state machine so every
 * transaction-triggering component in the app shows consistent approval/pending/confirmed/error
 * states instead of ad hoc booleans, and so no component can fire a second submission while one
 * is already in flight (`send` is a no-op while `phase` is "signing" or "confirming").
 */
export function useTxState() {
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const { writeContractAsync, data: hash, reset: resetWrite } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  const effectivePhase: TxPhase = isConfirmed ? "success" : isConfirming ? "confirming" : phase;
  const isBusy = effectivePhase === "signing" || effectivePhase === "confirming";

  const send = useCallback(
    async (params: { address: `0x${string}`; abi: Abi; functionName: string; args?: readonly unknown[] }) => {
      if (isBusy) return;
      setErrorMessage(undefined);
      setPhase("signing");
      try {
        await writeContractAsync(params);
        setPhase("confirming");
      } catch (err) {
        setPhase("error");
        setErrorMessage(humanizeError(err));
        throw err;
      }
    },
    [isBusy, writeContractAsync],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setErrorMessage(undefined);
    resetWrite();
  }, [resetWrite]);

  return { phase: effectivePhase, isBusy, hash, errorMessage, send, reset };
}

/** Maps a raw wagmi/viem error into a short, useful message for ordinary users. The original
 *  error is left for the caller to log to the console in development — never surfaced to the
 *  user as a raw stack trace or revert payload. */
export function humanizeError(err: unknown): string {
  if (err instanceof Error) {
    const firstLine = err.message.split("\n")[0]?.trim() ?? "";
    const lower = firstLine.toLowerCase();
    if (lower.includes("user rejected") || lower.includes("user denied")) {
      return "Transaction rejected in wallet.";
    }
    if (lower.includes("insufficient funds")) return "Insufficient funds for this transaction.";
    if (lower.includes("insufficient allowance") || lower.includes("erc20insufficientallowance")) {
      return "Approval required before this transaction can proceed.";
    }
    if (lower.includes("chain mismatch") || lower.includes("wrong network")) {
      return "Wrong network — switch to Robinhood Chain mainnet.";
    }
    if (lower.includes("network") || lower.includes("fetch") || lower.includes("timeout")) {
      return "Network error — check your connection and try again.";
    }
    return firstLine || "Transaction failed.";
  }
  return "Transaction failed.";
}
