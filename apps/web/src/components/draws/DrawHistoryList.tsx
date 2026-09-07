"use client";

import { AddressExplorerLink, TxExplorerLink } from "@/components/shared/ExplorerLink";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/shared/Skeleton";
import { useDrawHistory } from "@/hooks/useDrawHistory";
import { formatTimestamp, formatTokenAmount } from "@/lib/format";

export function DrawHistoryList() {
  const { status, records, page, hasMore, nextPage, prevPage } = useDrawHistory();

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return <ErrorState title="Couldn't load draw history" description="The RPC request failed. Try again shortly." />;
  }

  if (status === "unavailable") {
    return (
      <EmptyState
        title="Draw history isn't available yet"
        description="This will populate once the production prize engine is deployed and has run its first round."
      />
    );
  }

  if (status === "empty" || records.length === 0) {
    return <EmptyState title="No draws yet" description="Completed rounds will be listed here as they finalize." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {records.map((record) => (
        <div
          key={record.roundId}
          className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-muted-dim">Round {record.roundId}</span>
            <AddressExplorerLink address={record.winner} />
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm text-accent">{formatTokenAmount(record.prizeAmount, 18)}</span>
            <span className="text-xs text-muted">{formatTimestamp(record.finalizedAt)}</span>
            <TxExplorerLink hash={record.txHash} />
          </div>
        </div>
      ))}

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={prevPage}
          disabled={page === 0}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={nextPage}
          disabled={!hasMore}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
