import "./globals.css";
import type { Metadata } from "next";
import type { Viewport } from "next";

export const metadata: Metadata = {
  title: "BBC Ordering System",
  description: "Central Kitchen Consolidation System",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}