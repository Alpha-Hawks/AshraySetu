import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/common/Header";

export const metadata: Metadata = {
  title: "AshraySetu - Cyclone Shelter & Evacuation Management",
  description:
    "Offline-First Disaster Management & Evacuation Platform for Coastal Odisha",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0284C7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950 py-3 text-center text-xs text-slate-500">
          AshraySetu • Government of Odisha & District Disaster Management
          Authority, Kendrapara
        </footer>
      </body>
    </html>
  );
}
