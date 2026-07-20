import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FrameScope — Observability",
  description: "Traffic and API budget dashboard for Global FrameScope.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
