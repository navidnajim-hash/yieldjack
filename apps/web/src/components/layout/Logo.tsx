/**
 * Original YieldJack mark: a rounded vault door (savings/custody) with a spark badge
 * (yield/energy) sitting on its corner like a jackpot burst. Deliberately geometric and
 * simple rather than photorealistic, and unrelated to any PoolTogether or Robinhood mark.
 */
export function LogoSymbol({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="34" height="34" rx="10" fill="#10b981" fillOpacity="0.12" />
      <rect x="3" y="3" width="34" height="34" rx="10" stroke="#10b981" strokeWidth="2" />
      <circle cx="20" cy="20" r="9" stroke="#10b981" strokeWidth="2" />
      <circle cx="20" cy="20" r="2.25" fill="#10b981" />
      <path d="M20 13.5V16.5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M30 6L31.6 10.4L36 12L31.6 13.6L30 18L28.4 13.6L24 12L28.4 10.4L30 6Z"
        fill="#e8b93f"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-semibold tracking-tight">Yield</span>
      <span className="font-semibold tracking-tight text-gold">Jack</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoSymbol />
      <Wordmark className="text-lg text-foreground" />
    </span>
  );
}
