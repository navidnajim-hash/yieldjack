"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { XLink } from "@/components/shared/XIcon";
import { Logo } from "./Logo";
import { NetworkIndicator } from "./NetworkIndicator";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/app", label: "Save & Win" },
  { href: "/stake", label: "Stake JACK" },
  { href: "/jack", label: "JACK" },
  { href: "/draws", label: "Draws" },
  { href: "/transparency", label: "Transparency" },
  { href: "/how-it-works", label: "How It Works" },
] as const;

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="YieldJack home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-surface text-accent" : "text-muted hover:bg-surface hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <NetworkIndicator />
          <XLink />
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" label="Connect Wallet" />
        </div>

        <button
          type="button"
          className="rounded-md border border-border p-2 text-foreground lg:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="border-t border-border px-4 pb-5 lg:hidden">
          <nav className="flex flex-col gap-1 pt-3" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2.5 text-base font-medium ${
                    active ? "bg-surface text-accent" : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
            <NetworkIndicator />
            <XLink />
          </div>
          <div className="mt-3">
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" label="Connect Wallet" />
          </div>
        </div>
      )}
    </header>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5.5H17M3 10H17M3 14.5H17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
