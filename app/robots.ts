import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fatin.iq";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/history", "/auth/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
