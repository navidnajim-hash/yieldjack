import type { ReactNode } from "react";

/** Consistent max-width, horizontal padding, and vertical rhythm for every page's content. */
export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function PageSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`py-14 sm:py-20 ${className}`}>{children}</section>;
}
