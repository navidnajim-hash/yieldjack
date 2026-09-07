import Link from "next/link";
import { GITHUB_URL } from "@/lib/constants";

export function TransparencySection() {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-foreground">Open contracts, open source</h2>
        <p className="max-w-xl text-sm text-muted">
          Every contract address YieldJack uses is published on the Transparency page the moment it&apos;s
          deployed. The full source is public on GitHub.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-3">
        <Link
          href="/transparency"
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-hover"
        >
          Transparency
        </Link>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-hover"
        >
          View source
        </a>
      </div>
    </div>
  );
}
