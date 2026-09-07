import { X_URL } from "@/lib/constants";

export function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-7.6 8.7L23.3 22H16.7l-5.2-6.8L5.6 22H2.4l8.1-9.3L1.6 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.7L7.4 4H5.6l12.1 16Z" />
    </svg>
  );
}

/** Links to the official YieldJack X/Twitter account. Always opens in a new tab safely. */
export function XLink({ className, label = "YieldJack on X" }: { className?: string; label?: string }) {
  return (
    <a
      href={X_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={className ?? "text-muted transition-colors hover:text-foreground"}
    >
      <XIcon />
    </a>
  );
}
