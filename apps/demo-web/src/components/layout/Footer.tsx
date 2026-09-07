import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="max-w-md text-sm text-muted">
            Save. Earn. Someone wins. YieldJack is an unaudited testnet demo running on Robinhood
            Chain Testnet with worthless mock tokens — no real funds are ever at risk.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer navigation">
          <Link href="/how-it-works" className="text-muted hover:text-foreground">
            How It Works
          </Link>
          <Link href="/transparency" className="text-muted hover:text-foreground">
            Transparency
          </Link>
          <Link href="/status" className="text-muted hover:text-foreground">
            Testnet Status
          </Link>
        </nav>
      </div>
    </footer>
  );
}
