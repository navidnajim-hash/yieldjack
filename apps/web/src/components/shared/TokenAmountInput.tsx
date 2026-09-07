"use client";

import { formatUnits } from "viem";

export function TokenAmountInput({
  id,
  label,
  symbol,
  value,
  onChange,
  maxValue,
  decimals,
  disabled = false,
  placeholder = "0.0",
}: {
  id: string;
  label: string;
  symbol: string;
  value: string;
  onChange: (value: string) => void;
  maxValue?: bigint;
  decimals: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  const handleMax = () => {
    if (maxValue === undefined) return;
    onChange(formatUnits(maxValue, decimals));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-muted">
          {label}
        </label>
        {maxValue !== undefined && (
          <button
            type="button"
            onClick={handleMax}
            disabled={disabled}
            className="text-xs font-semibold text-accent hover:text-accent-hover disabled:opacity-50"
          >
            Max: {formatUnits(maxValue, decimals)} {symbol}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2.5 focus-within:border-accent/60">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full min-w-0 bg-transparent font-mono text-lg text-foreground outline-none placeholder:text-muted-dim disabled:opacity-50"
        />
        <span className="shrink-0 text-sm font-medium text-muted">{symbol}</span>
      </div>
    </div>
  );
}
