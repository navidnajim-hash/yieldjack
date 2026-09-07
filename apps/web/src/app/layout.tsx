import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MainnetDemoBanner } from "@/components/shared/MainnetDemoBanner";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "YieldJack — Save. Earn. Someone wins.",
  description:
    "YieldJack is a prize-savings testnet dApp on Robinhood Chain Testnet. Deposit Mock USDG, the yield builds a prize, one eligible saver wins each round.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <Providers>
          <MainnetDemoBanner />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
