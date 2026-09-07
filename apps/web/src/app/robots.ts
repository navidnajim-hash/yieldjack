import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/constants";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
  };
}
