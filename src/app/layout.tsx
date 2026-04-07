import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BBC Ordering System",
  description: "Central Kitchen Consolidation System",
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