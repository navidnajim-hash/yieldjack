import { describe, expect, it } from "vitest";
import { formatBps, formatDuration, formatJack, formatTimestamp, formatUsdg, shortenAddress } from "@/lib/format";

describe("formatUsdg", () => {
  it("formats a 6-decimal amount with thousands separators", () => {
    expect(formatUsdg(1_234_560_000n)).toBe("1,234.56");
  });

  it("formats zero", () => {
    expect(formatUsdg(0n)).toBe("0.00");
  });

  it("returns an em dash for missing values", () => {
    expect(formatUsdg(undefined)).toBe("—");
    expect(formatUsdg(null)).toBe("—");
  });
});

describe("formatJack", () => {
  it("formats an 18-decimal amount", () => {
    expect(formatJack(500_000000000000000000n)).toBe("500");
  });
});

describe("shortenAddress", () => {
  it("shortens a full address", () => {
    expect(shortenAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
  });

  it("returns the em dash for empty input", () => {
    expect(shortenAddress(undefined)).toBe("—");
    expect(shortenAddress("")).toBe("—");
  });
});

describe("formatBps", () => {
  it("converts basis points to a percentage", () => {
    expect(formatBps(1234)).toBe("12.34%");
    expect(formatBps(0)).toBe("0.00%");
    expect(formatBps(10000)).toBe("100.00%");
  });

  it("returns the em dash for missing values", () => {
    expect(formatBps(undefined)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("formats days and hours", () => {
    expect(formatDuration(2 * 86400 + 3 * 3600)).toBe("2d 3h");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(3 * 3600 + 25 * 60)).toBe("3h 25m");
  });

  it("formats minutes only when under an hour", () => {
    expect(formatDuration(5 * 60)).toBe("5m");
  });

  it("formats seconds only when under a minute", () => {
    expect(formatDuration(42)).toBe("42s");
  });

  it("clamps non-positive durations to 0s", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(-10)).toBe("0s");
  });
});

describe("formatTimestamp", () => {
  it("returns the em dash for a zero or missing timestamp", () => {
    expect(formatTimestamp(0)).toBe("—");
    expect(formatTimestamp(undefined)).toBe("—");
  });

  it("formats a real timestamp into a non-empty string", () => {
    const result = formatTimestamp(1_700_000_000);
    expect(result).not.toBe("—");
    expect(result.length).toBeGreaterThan(0);
  });
});
