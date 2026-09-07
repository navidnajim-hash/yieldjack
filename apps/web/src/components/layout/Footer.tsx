import { robinhoodChainMainnet } from "@yieldjack/config";
import Link from "next/link";
import type { ReactNode } from "react";
import { GITHUB_URL, X_URL } from "@/lib/constants";
import { Logo } from "./Logo";

const PRODUCT_LINKS = [
  { href: "/app", label: "Save & Win" },
  { href: "/stake", label: "Stake JACK" },
  { href: "/jack", label: "JACK" },
  { href: "/draws", label: "Draws" },
] as const;

const explorerUrl = robinhoodChainMainnet.blockExplorers?.default.url;

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="flex max-w-sm flex-col gap-3">
            <Logo />
            <p className="text-sm text-muted">Save. Earn. Someone wins.</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <FooterColumn title="Product">
              {PRODUCT_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm text-muted hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </FooterColumn>

            <FooterColumn title="Protocol">
              <Link href="/transparency" className="text-sm text-muted hover:text-foreground">
                Transparency
              </Link>
              <Link href="/how-it-works" className="text-sm text-muted hover:text-foreground">
                How It Works
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted hover:text-foreground"
              >
                GitHub
              </a>
            </FooterColumn>

            <FooterColumn title="Connect">
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted hover:text-foreground"
              >
                X / Twitter
              </a>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted hover:text-foreground"
                >
                  Robinhood Chain explorer
                </a>
              )}
            </FooterColumn>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-dim">
          <p>
            YieldJack pools deposits to generate yield and distributes that yield as recurring prizes. Digital
            assets carry risk, including loss of yield and smart-contract risk. Nothing here is financial advice.
          </p>
          <p>YieldJack is not affiliated with Robinhood Markets, Inc.</p>
          <p>© {new Date().getFullYear()} YieldJack.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-dim">{title}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
