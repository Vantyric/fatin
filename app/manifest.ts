import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "فَطِن | FATIN Security",
    short_name: "فَطِن",
    description: "منصة التحليل الأمني الاستباقي لكشف رسائل التصيد والاحتيال الرقمي والروابط الخبيثة.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B1020",
    theme_color: "#0B1020",
    dir: "rtl",
    lang: "ar",
    orientation: "portrait",
    categories: ["utilities", "security"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
