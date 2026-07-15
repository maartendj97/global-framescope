import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { MotionConfig } from "motion/react";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE_NAME = "Global FrameScope";
const SITE_DESCRIPTION = "Compare international framing, country by country.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

// Matches --background in globals.css for each theme, so the browser
// chrome (address bar, etc.) reads as an extension of the page rather
// than a mismatched system default.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#07111e" },
  ],
};

// On first visit (no stored choice yet), snapshot the OS color-scheme once
// and persist it as an explicit choice — from then on it's a fixed
// light/dark preference, not a live-following "system" mode.
const THEME_INIT_SCRIPT = `(function(){try{var k="framescope-theme";var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";localStorage.setItem(k,t);}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${playfairDisplay.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Global safety net: any motion gesture (whileTap/whileHover) added
            anywhere automatically respects the OS reduced-motion setting,
            on top of the explicit checks in src/lib/motionConfig.ts used
            for mount/layout animations. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
