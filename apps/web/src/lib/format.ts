import { formatUnits, parseUnits } from "viem";

const tokenFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4, minimumFractionDigits: 0 });

/** Formats a raw bigint token amount at `decimals` as a locale string, e.g. "1,234.5". Routes
 *  through `formatUnits` + `Intl.NumberFormat` on the resulting string — the bigint itself is
 *  never narrowed through `Number()`, so precision is never silently lost for large balances. */
export function formatTokenAmount(amount: bigint | undefined | null, decimals: number): string {
  if (amount === undefined || amount === null) return "—";
  return tokenFormatter.format(Number(formatUnits(amount, decimals)));
}

/**
 * Parses a user-typed decimal string into a raw bigint at `decimals`, or `null` if the input
 * isn't a valid non-negative decimal number. Delegates the actual scaling to viem's
 * `parseUnits` (string-based, exact) rather than any floating-point arithmetic.
 */
export function parseTokenAmount(input: string, decimals: number): bigint | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === "." ) return null;
  try {
    const value = parseUnits(trimmed, decimals);
    return value >= 0n ? value : null;
  } catch {
    return null;
  }
}

/** Shortens a 0x-address to "0x1234…abcd". */
export function shortenAddress(address: string | undefined | null): string {
  if (!address) return "—";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Formats basis points (0-10000) as a percentage string, e.g. 7000 -> "70.00%". */
export function formatBps(bps: number | undefined | null): string {
  if (bps === undefined || bps === null) return "—";
  return `${(bps / 100).toFixed(2)}%`;
}

/** Formats a duration in seconds as a compact "1d 2h" / "2h 3m" / "3m" / "4s" string, showing
 *  only the largest unit and the one below it. */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0s";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/** Formats a unix timestamp (seconds) as a locale date/time string. */
export function formatTimestamp(unixSeconds: number | bigint | undefined | null): string {
  if (unixSeconds === undefined || unixSeconds === null || Number(unixSeconds) === 0) return "—";
  return new Date(Number(unixSeconds) * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
