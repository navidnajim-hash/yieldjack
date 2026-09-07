import { useCallback, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Abi } from "viem";

export type TxPhase = "idle" | "signing" | "confirming" | "success" | "error";

/**
 * Wraps wagmi's write + wait-for-receipt flow into one clear state machine so every
 * transaction-triggering component in the app shows consistent approval/pending/confirmed/error
 * states instead of ad hoc booleans.
 */
export function useTxState() {
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const { writeContractAsync, data: hash, reset: resetWrite } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  const effectivePhase: TxPhase = isConfirmed
    ? "success"
    : isConfirming
      ? "confirming"
      : phase;

  const send = useCallback(
    async (params: { address: `0x${string}`; abi: Abi; functionName: string; args?: readonly unknown[] }) => {
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
    [writeContractAsync],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setErrorMessage(undefined);
    resetWrite();
  }, [resetWrite]);

  return { phase: effectivePhase, hash, errorMessage, send, reset };
}

function humanizeError(err: unknown): string {
  if (err instanceof Error) {
    // viem/wagmi errors often carry a much longer message with revert data appended after a
    // blank line — the first line is almost always the useful, human-readable part.
    const firstLine = err.message.split("\n")[0]?.trim();
    if (firstLine?.toLowerCase().includes("user rejected")) return "Transaction rejected in wallet.";
    return firstLine || "Transaction failed.";
  }
  return "Transaction failed.";
}
