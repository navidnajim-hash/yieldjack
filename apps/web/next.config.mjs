import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export so the built output can be uploaded to ordinary web hosting (this is also
  // what Vercel builds for this app) — a pure client-side dApp with no server routes or
  // middleware.
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  // Pins the workspace root to this repo so an unrelated lockfile elsewhere on the machine
  // (e.g. in a parent directory) never confuses Next's root inference.
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  webpack: (config) => {
    // wagmi/connectors bundles a Coinbase "Base Account" connector we never use (our wallet
    // list in src/lib/wagmi.ts is deliberately curated to injected/MetaMask/Rainbow/
    // WalletConnect only). That connector statically imports @coinbase/cdp-sdk, which in turn
    // statically imports its own *optional* peer dependencies (@x402/evm, @x402/core, etc.) for
    // an unrelated payments feature — those are correctly left uninstalled, which breaks
    // webpack's build-time resolution even though the code path is provably unreachable at
    // runtime. Aliasing the two packages out short-circuits that dead branch entirely.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@coinbase/cdp-sdk": false,
      "@base-org/account": false,
      // MetaMask SDK's React Native compatibility layer and WalletConnect's optional
      // dev-only pretty-printer transport — neither applies to a browser build, and both
      // are the source of well-known, harmless "module not found" warnings across the
      // wagmi/RainbowKit ecosystem.
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
