"use client";

import { parseUnits } from "viem";
import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { JACK_DECIMALS, USDG_DECIMALS } from "@yieldjack/config";
import { useContract } from "@/hooks/useContract";
import { useTxState } from "@/hooks/useTxState";
import { useCurrentRound } from "@/hooks/useYieldJackData";
import { formatJack } from "@/lib/format";
import { TxStatus } from "@/components/shared/TxStatus";

export function SponsorForm() {
  const { address } = useAccount();
  const usdg = useContract("MockUSDG");
  const jack = useContract("MockJACK");
  const registry = useContract("SponsorRegistry");
  const { roundId } = useCurrentRound();

  const [usdgInput, setUsdgInput] = useState("");
  const [jackInput, setJackInput] = useState("");
  const [metadata, setMetadata] = useState("");

  const approveUsdgTx = useTxState();
  const approveJackTx = useTxState();
  const sponsorTx = useTxState();

  const minJackBurn = useReadContract({
    address: registry?.address,
    abi: registry?.abi,
    functionName: "minJackBurn",
    query: { enabled: !!registry },
  });

  const usdgAllowance = useReadContract({
    address: usdg?.address,
    abi: usdg?.abi,
    functionName: "allowance",
    args: address && registry ? [address, registry.address] : undefined,
    query: { enabled: !!usdg && !!registry && !!address },
  });

  const jackAllowance = useReadContract({
    address: jack?.address,
    abi: jack?.abi,
    functionName: "allowance",
    args: address && registry ? [address, registry.address] : undefined,
    query: { enabled: !!jack && !!registry && !!address },
  });

  let usdgAmount: bigint | undefined;
  let jackAmount: bigint | undefined;
  try {
    usdgAmount = usdgInput ? parseUnits(usdgInput, USDG_DECIMALS) : undefined;
    jackAmount = jackInput ? parseUnits(jackInput, JACK_DECIMALS) : undefined;
  } catch {
    usdgAmount = undefined;
    jackAmount = undefined;
  }

  const minBurn = minJackBurn.data as bigint | undefined;
  const belowMin = jackAmount !== undefined && minBurn !== undefined && jackAmount < minBurn;

  const needsUsdgApproval =
    usdgAmount !== undefined && (usdgAllowance.data === undefined || (usdgAllowance.data as bigint) < usdgAmount);
  const needsJackApproval =
    jackAmount !== undefined && (jackAllowance.data === undefined || (jackAllowance.data as bigint) < jackAmount);

  const readyToSponsor =
    !!registry &&
    usdgAmount !== undefined &&
    usdgAmount > 0n &&
    jackAmount !== undefined &&
    !belowMin &&
    !needsUsdgApproval &&
    !needsJackApproval;

  async function handleSponsor() {
    if (!registry || usdgAmount === undefined || jackAmount === undefined) return;
    await sponsorTx.send({
      address: registry.address,
      abi: registry.abi,
      functionName: "sponsor",
      args: [usdgAmount, jackAmount, metadata],
    });
    setUsdgInput("");
    setJackInput("");
    setMetadata("");
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Sponsor a bonus prize</h3>
        <p className="text-xs text-muted">
          Fund round #{roundId?.toString() ?? "—"}&apos;s prize with mUSDG and burn mJACK to
          create the sponsorship. Sponsoring never improves anyone&apos;s base odds — it only
          grows the pot.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Bonus prize (mUSDG)</span>
        <input
          type="number"
          min="0"
          step="any"
          value={usdgInput}
          onChange={(e) => setUsdgInput(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">
          mJACK to burn {minBurn !== undefined && <>(min {formatJack(minBurn)})</>}
        </span>
        <input
          type="number"
          min="0"
          step="any"
          value={jackInput}
          onChange={(e) => setJackInput(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Message (optional)</span>
        <input
          type="text"
          maxLength={128}
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
          placeholder="e.g. Sponsored by..."
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
        />
      </label>

      {belowMin && <p className="text-xs text-danger">Below the minimum JACK burn amount.</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        {needsUsdgApproval && (
          <button
            type="button"
            onClick={async () => {
              if (!usdg || !registry || usdgAmount === undefined) return;
              await approveUsdgTx.send({
                address: usdg.address,
                abi: usdg.abi,
                functionName: "approve",
                args: [registry.address, usdgAmount],
              });
              await usdgAllowance.refetch();
            }}
            disabled={approveUsdgTx.phase === "signing" || approveUsdgTx.phase === "confirming"}
            className="flex-1 rounded-md bg-surface-hover px-4 py-2 text-sm font-medium text-foreground hover:bg-border disabled:opacity-50"
          >
            Approve mUSDG
          </button>
        )}
        {needsJackApproval && (
          <button
            type="button"
            onClick={async () => {
              if (!jack || !registry || jackAmount === undefined) return;
              await approveJackTx.send({
                address: jack.address,
                abi: jack.abi,
                functionName: "approve",
                args: [registry.address, jackAmount],
              });
              await jackAllowance.refetch();
            }}
            disabled={approveJackTx.phase === "signing" || approveJackTx.phase === "confirming"}
            className="flex-1 rounded-md bg-surface-hover px-4 py-2 text-sm font-medium text-foreground hover:bg-border disabled:opacity-50"
          >
            Approve mJACK
          </button>
        )}
        {!needsUsdgApproval && !needsJackApproval && (
          <button
            type="button"
            onClick={handleSponsor}
            disabled={!readyToSponsor || sponsorTx.phase === "signing" || sponsorTx.phase === "confirming"}
            className="flex-1 rounded-md bg-gold px-4 py-2 text-sm font-medium text-background hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sponsor round
          </button>
        )}
      </div>

      <TxStatus phase={sponsorTx.phase} hash={sponsorTx.hash} errorMessage={sponsorTx.errorMessage} />
    </div>
  );
}
