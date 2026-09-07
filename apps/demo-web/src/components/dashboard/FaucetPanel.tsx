"use client";

import { useEffect, useState } from "react";
import { useContract } from "@/hooks/useContract";
import { useTxState } from "@/hooks/useTxState";
import { useFaucetInfo, useTokenBalance } from "@/hooks/useYieldJackData";
import { formatDuration, formatJack, formatUsdg } from "@/lib/format";
import { GasCostNotice } from "@/components/shared/GasCostNotice";
import { TxStatus } from "@/components/shared/TxStatus";

function useCountdown(targetUnixSeconds: bigint): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return Math.max(0, Number(targetUnixSeconds) - now);
}

function FaucetButton({ tokenName, label }: { tokenName: "MockUSDG" | "MockJACK"; label: string }) {
  const contract = useContract(tokenName);
  const { nextClaimAt, faucetAmount } = useFaucetInfo(tokenName);
  const { refetch: refetchBalance } = useTokenBalance(tokenName);
  const remaining = useCountdown(nextClaimAt);
  const tx = useTxState();
  const ready = remaining <= 0;

  async function handleClaim() {
    if (!contract) return;
    await tx.send({ address: contract.address, abi: contract.abi, functionName: "faucet" });
    await refetchBalance();
  }

  const amountLabel = tokenName === "MockUSDG" ? formatUsdg(faucetAmount) : formatJack(faucetAmount);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClaim}
        disabled={!contract || !ready || tx.phase === "signing" || tx.phase === "confirming"}
        className="rounded-md border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {ready ? `Get ${amountLabel} ${label}` : `Next claim in ${formatDuration(remaining)}`}
      </button>
      <TxStatus phase={tx.phase} hash={tx.hash} errorMessage={tx.errorMessage} />
    </div>
  );
}

export function FaucetPanel() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Testnet Faucets</h3>
        <p className="text-xs text-muted">
          Worthless test tokens only. Faucets are per-wallet and rate-limited.
        </p>
        <GasCostNotice />
      </div>
      <FaucetButton tokenName="MockUSDG" label="mUSDG" />
      <FaucetButton tokenName="MockJACK" label="mJACK" />
    </div>
  );
}
