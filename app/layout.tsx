import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "sports-watch — never miss your team",
  description: "Schedules and where to watch every game.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
