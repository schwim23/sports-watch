import type { Metadata, Viewport } from "next";
import { Oswald, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "sports-watch — never miss your team",
  description: "Schedules and where to watch every game.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "sports-watch",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${oswald.variable} ${sourceSans.variable}`}>
      <body
        style={{
          fontFamily: "var(--font-source-sans), 'Source Sans 3', system-ui, sans-serif",
        }}
      >
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
