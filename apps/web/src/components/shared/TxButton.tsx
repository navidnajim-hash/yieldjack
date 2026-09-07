"use client";

import type { TxPhase } from "@/hooks/useTxState";

const PHASE_LABEL: Partial<Record<TxPhase, string>> = {
  signing: "Confirm in wallet…",
  confirming: "Confirming…",
};

export function TxButton({
  onClick,
  phase,
  disabled = false,
  disabledReason,
  idleLabel,
  variant = "primary",
}: {
  onClick: () => void;
  phase: TxPhase;
  disabled?: boolean;
  disabledReason?: string;
  idleLabel: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const isBusy = phase === "signing" || phase === "confirming";
  const label = PHASE_LABEL[phase] ?? idleLabel;
  const isDisabled = disabled || isBusy;

  const styles =
    variant === "primary"
      ? "bg-accent text-accent-ink hover:bg-accent-hover"
      : variant === "danger"
        ? "border border-danger/50 text-danger hover:bg-danger/10"
        : "border border-border text-foreground hover:bg-surface-hover";

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        aria-busy={isBusy}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
      >
        {label}
      </button>
      {disabled && disabledReason && !isBusy && <p className="text-xs text-muted-dim">{disabledReason}</p>}
    </div>
  );
}
