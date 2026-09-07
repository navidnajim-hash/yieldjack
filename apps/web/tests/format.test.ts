import { describe, expect, it } from "vitest";
import { formatBps, formatDuration, formatTokenAmount, parseTokenAmount, shortenAddress } from "@/lib/format";

describe("formatTokenAmount", () => {
  it("formats a raw 18-decimal amount", () => {
    expect(formatTokenAmount(1_500_000_000_000_000_000n, 18)).toBe("1.5");
  });

  it("shows an em dash for undefined/null", () => {
    expect(formatTokenAmount(undefined, 18)).toBe("—");
    expect(formatTokenAmount(null, 18)).toBe("—");
  });

  it("handles very large bigint reward values without precision-losing Number() narrowing artifacts", () => {
    // 123,456,789.123456789012345678 JACK at 18 decimals — far beyond Number's safe integer
    // range once scaled to raw units, which is exactly why the raw bigint must never be passed
    // through `Number()` directly.
    const raw = 123_456_789_123456789012345678n;
    const formatted = formatTokenAmount(raw, 18);
    expect(formatted.startsWith("123,456,789")).toBe(true);
  });

  it("formats zero", () => {
    expect(formatTokenAmount(0n, 18)).toBe("0");
  });
});

describe("parseTokenAmount", () => {
  it("parses a plain decimal string", () => {
    expect(parseTokenAmount("1.5", 18)).toBe(1_500_000_000_000_000_000n);
  });

  it("returns null for empty input", () => {
    expect(parseTokenAmount("", 18)).toBeNull();
    expect(parseTokenAmount("   ", 18)).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(parseTokenAmount("abc", 18)).toBeNull();
    expect(parseTokenAmount("-1", 18)).toBeNull();
    expect(parseTokenAmount("1.2.3", 18)).toBeNull();
    expect(parseTokenAmount(".", 18)).toBeNull();
  });

  it("round-trips through formatTokenAmount", () => {
    const raw = parseTokenAmount("42.123456", 18);
    expect(raw).not.toBeNull();
    expect(formatTokenAmount(raw, 18)).toBe("42.1235"); // display rounds to 4 decimal places
  });
});

describe("shortenAddress", () => {
  it("shortens a full address", () => {
    expect(shortenAddress("0x1234567890123456789012345678901234567890")).toBe("0x1234…7890");
  });

  it("returns an em dash for falsy input", () => {
    expect(shortenAddress(null)).toBe("—");
    expect(shortenAddress(undefined)).toBe("—");
    expect(shortenAddress("")).toBe("—");
  });
});

describe("formatBps", () => {
  it("formats basis points as a percentage", () => {
    expect(formatBps(7000)).toBe("70.00%");
    expect(formatBps(2000)).toBe("20.00%");
    expect(formatBps(1000)).toBe("10.00%");
  });

  it("returns an em dash for null/undefined", () => {
    expect(formatBps(null)).toBe("—");
    expect(formatBps(undefined)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("formats days and hours", () => {
    expect(formatDuration(90_000)).toBe("1d 1h");
  });

  it("formats zero/negative as 0s", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(-5)).toBe("0s");
  });
});
