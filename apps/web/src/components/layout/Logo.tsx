/**
 * YieldJack mark: a rounded vault door (savings/custody) with a spark badge (yield) on its
 * corner. Deliberately geometric and simple, drawn fresh for the production brand's electric-lime
 * accent — unrelated to any PoolTogether or Robinhood mark.
 */
export function LogoSymbol({ className, size = 30 }: { className?: string; size?: number }) {
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
      <rect x="3" y="3" width="34" height="34" rx="10" fill="#ddfe4c" fillOpacity="0.14" />
      <rect x="3" y="3" width="34" height="34" rx="10" stroke="#ddfe4c" strokeWidth="2" />
      <circle cx="20" cy="20" r="9" stroke="#ddfe4c" strokeWidth="2" />
      <circle cx="20" cy="20" r="2.25" fill="#ddfe4c" />
      <path d="M20 13.5V16.5" stroke="#ddfe4c" strokeWidth="2" strokeLinecap="round" />
      <path d="M29 5.5L30.5 9.5L34.5 11L30.5 12.5L29 16.5L27.5 12.5L23.5 11L27.5 9.5L29 5.5Z" fill="#f3f5ec" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-semibold tracking-tight">Yield</span>
      <span className="font-semibold tracking-tight text-accent">Jack</span>
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
