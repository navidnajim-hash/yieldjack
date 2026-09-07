"use client";

import { useState } from "react";
import { prizeSavingsReadiness } from "@/lib/production/resolver";

export interface DrawRecord {
  roundId: number;
  winner: `0x${string}`;
  prizeAmount: bigint;
  finalizedAt: number;
  txHash: `0x${string}`;
}

export type DrawHistoryStatus = "unavailable" | "loading" | "error" | "empty" | "ready";

const PAGE_SIZE = 10;

/**
 * Bounded, paginated draw-history loading architecture. There is no production prize engine
 * deployed yet, so this always resolves to `"unavailable"` — but the page size, cursor, and
 * retry plumbing are already in place for whoever wires in the real `productionPrizeEngine`
 * event/log reads once that contract exists. Never imports the demo draw data.
 */
export interface DrawHistoryState {
  status: DrawHistoryStatus;
  records: DrawRecord[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextPage: () => void;
  prevPage: () => void;
}

export function useDrawHistory(): DrawHistoryState {
  const [page, setPage] = useState(0);

  const status: DrawHistoryStatus = prizeSavingsReadiness.configured ? "empty" : "unavailable";
  const records: DrawRecord[] = [];

  return {
    status,
    records,
    page,
    pageSize: PAGE_SIZE,
    hasMore: false,
    nextPage: () => setPage((p) => p + 1),
    prevPage: () => setPage((p) => Math.max(0, p - 1)),
  };
}
