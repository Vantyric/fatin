import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PwaRegister } from "@/components/PwaRegister";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-arabic",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B1020" },
    { media: "(prefers-color-scheme: light)", color: "#F6F8FC" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://fatin.iq"),
  title: "فَطِن | FATIN Security - منصة التحليل الأمني وكشف الهندسة الاجتماعية",
  description:
    "منصة تحليل استباقية متقدمة لفحص الرسائل المشبوهة، الروابط الخبيثة، ولقطات الشاشة وكشف أساليب الهندسة الاجتماعية والتصيد الرقمي عبر التحليل السلوكي.",
  keywords: [
    "فحص النصب",
    "كشف التصيد",
    "مكافحة الاحتيال الرقمي",
    "فحص الروابط الخبيثة",
    "هندسة اجتماعية",
    "أمن المعلومات",
    "فحص الرسائل المشبوهة",
    "سرقة الحسابات",
    "FATIN Security",
    "Cyber Threat Intelligence",
    "Social Engineering Detection",
  ],
  authors: [{ name: "FATIN Security" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "فَطِن | FATIN Security - كشف التهديدات والتصيد الرقمي",
    description: "منصة تحليل استباقية لكشف رسائل التصيد والاحتيال الرقمي واختراق الحسابات بالتحليل السلوكي.",
    url: "/",
    siteName: "FATIN Security",
    locale: "ar",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "شعار فَطِن FATIN Security - كشف التهديدات الرقمية",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "فَطِن | FATIN Security - كشف التهديدات والتصيد الرقمي",
    description: "منصة تحليل استباقية لكشف رسائل التصيد والاحتيال الرقمي واختراق الحسابات بالتحليل السلوكي.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={ibmPlexSansArabic.variable} suppressHydrationWarning>
      <head>
        <Script src="/theme.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen flex flex-col font-arabic">
        <ThemeProvider>
          <PwaRegister />
          <Header />
          <main className="flex-1 w-full" id="main-content">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
        <Analytics />
</body>
    </html>
  );
}
