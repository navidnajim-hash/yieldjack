import { formatUnits } from "viem";
import { USDG_DECIMALS, JACK_DECIMALS } from "@yieldjack/config";

const usdgFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const jackFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** Formats a raw 6-decimal USDG amount as "1,234.56". */
export function formatUsdg(amount: bigint | undefined | null): string {
  if (amount === undefined || amount === null) return "—";
  return usdgFormatter.format(Number(formatUnits(amount, USDG_DECIMALS)));
}

/** Formats a raw 18-decimal JACK amount as "1,234.56". */
export function formatJack(amount: bigint | undefined | null): string {
  if (amount === undefined || amount === null) return "—";
  return jackFormatter.format(Number(formatUnits(amount, JACK_DECIMALS)));
}

/** Shortens a 0x-address to "0x1234…abcd". */
export function shortenAddress(address: string | undefined | null): string {
  if (!address) return "—";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Formats basis points (0-10000) as a percentage string, e.g. 1234 -> "12.34%". */
export function formatBps(bps: bigint | number | undefined | null): string {
  if (bps === undefined || bps === null) return "—";
  const value = Number(bps) / 100;
  return `${value.toFixed(2)}%`;
}

/** Formats a duration in seconds as a compact "1d 2h" / "2h 3m" / "3m" / "4s" string, showing
 *  only the largest unit and the one below it. */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s";
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
