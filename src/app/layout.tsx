import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import WebVitals from "@/components/WebVitals";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/constants";
import {
  organizationJsonLd,
  webSiteJsonLd,
  DEFAULT_OG_IMAGE,
  jsonLdString,
} from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap", // CLS improvement: prevents FOUT layout shift
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — IoT Gadgets, Sensors & Dev Boards Nepal`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "IoT Nepal",
    "Arduino Nepal",
    "ESP32 Nepal",
    "Raspberry Pi Nepal",
    "IoT sensors Nepal",
    "microcontroller development boards",
    "electronics components Nepal",
    "robotics parts Nepal",
    "IoTMart",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  formatDetection: { telephone: false },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — IoT Gadgets, Sensors & Dev Boards Nepal`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — IoT Hardware Store Nepal`,
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@iotmart_np",
    title: `${SITE_NAME} — IoT Gadgets, Sensors & Dev Boards Nepal`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your Google / Bing verification tokens here once you have them
    // google: "YOUR_GOOGLE_VERIFICATION_CODE",
    // other: { "msvalidate.01": "YOUR_BING_VERIFICATION_CODE" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Preconnect to the FastAPI backend for faster LCP on image-heavy pages */}
        <link rel="preconnect" href="http://localhost:8000" />
        {/* Favicon variants */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="bg-[#F0E9E3] text-[#11100E] font-sans antialiased">
        {/* ── WCAG 2.1 AA: Skip navigation link ─────────────────────────── */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#5D1C34] focus:text-white focus:rounded-lg focus:font-medium focus:outline-none focus:ring-2 focus:ring-[#A67D45]"
        >
          Skip to main content
        </a>

        <WebVitals />
        <CartProvider>{children}</CartProvider>

        {/* ── Root-level structured data ──────────────────────────────────
            Injected once on every page. Organisation + WebSite schemas are
            required for Google Knowledge Panel and Sitelinks Search Box.
        ─────────────────────────────────────────────────────────────── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdString(organizationJsonLd()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdString(webSiteJsonLd()),
          }}
        />

        {/* PWA: register service worker on secure origins only (not localhost, to avoid stale-chunk caching during dev) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'if ("serviceWorker" in navigator) { if (location.hostname === "localhost") { navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {}); } else if (location.protocol === "https:") { window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(function () {}); }); } }',
          }}
        />
      </body>
    </html>
  );
}
