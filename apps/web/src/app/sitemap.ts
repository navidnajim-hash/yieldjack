import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/constants";

// Required for a static `export` build — a sitemap route has no per-request dynamic behavior
// here, so it's safe to force static generation at build time.
export const dynamic = "force-static";

const ROUTES = ["/", "/app", "/stake", "/jack", "/draws", "/transparency", "/how-it-works"];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: `${CANONICAL_ORIGIN}${route}`,
    lastModified: new Date(),
  }));
}
