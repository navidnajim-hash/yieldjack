import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CANONICAL_ORIGIN, X_URL } from "@/lib/constants";
import { Providers } from "./providers";
import "./globals.css";

const TITLE = "YieldJack | Save. Earn. Someone wins.";
const DESCRIPTION =
  "YieldJack is a prize-savings product on Robinhood Chain: deposit, keep your tracked principal, and let pooled yield fund recurring prizes. $JACK stakers earn a share of YieldJack's creator-fee revenue.";

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL_ORIGIN,
    siteName: "YieldJack",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    site: "@YieldJack",
    creator: "@YieldJack",
  },
  other: {
    "twitter:url": X_URL,
  },
};

export const viewport: Viewport = {
  themeColor: "#090b08",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-ink"
        >
          Skip to content
        </a>
        <Providers>
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
