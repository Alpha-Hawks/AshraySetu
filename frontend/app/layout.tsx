import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/common/Header";
import UserSessionTracker from "@/components/common/UserSessionTracker";

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
  themeColor: "#F2F2F7",
};

import BottomNavbar from "@/components/common/BottomNavbar";
import MacTabHeader from "@/components/common/MacTabHeader";
import GenieWatcher from "@/genie/GenieWatcher";
import { MacWindowProvider } from "@/lib/window/MacWindowManager";
import MacWindowOverlay from "@/components/window/MacWindowOverlay";
import LiquidGlassCardShader from "@/lib/liquid-glass/LiquidGlassCardShader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-tone="light">
      <body className="bg-[#F2F2F7] text-slate-900 min-h-screen flex flex-col antialiased relative overflow-x-hidden selection:bg-[#007AFF]/20 selection:text-[#007AFF]">
        {/* Apple Ambient Liquid Glass Background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden liquid-glass-backdrop" aria-hidden="true">
          <div className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-sky-400/20 via-cyan-300/15 to-transparent blur-[90px] transform-gpu pointer-events-none" />
          <div className="absolute top-[8%] -right-[12%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-violet-500/18 via-purple-400/12 to-transparent blur-[100px] transform-gpu pointer-events-none" />
          <div className="absolute top-[45%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-r from-blue-400/12 via-indigo-300/10 to-transparent blur-[110px] transform-gpu pointer-events-none" />
          <div className="absolute -bottom-[10%] left-[5%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-sky-300/15 via-teal-300/10 to-transparent blur-[95px] transform-gpu pointer-events-none" />
          <div className="absolute -bottom-[15%] -right-[10%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tl from-purple-400/14 via-fuchsia-300/10 to-transparent blur-[100px] transform-gpu pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#00000006_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        </div>

        {/* Mac Window Architecture */}
        <MacWindowProvider>
          {/* Foreground Content */}
          <div className="relative z-10 flex flex-col min-h-screen">
            <GenieWatcher />
            <UserSessionTracker />
            <Header />
            {/* Precision gap between fixed header and top cards, plus pb-24 for bottom dock */}
            <main
              data-view-transition="page"
              className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pb-24 sm:pb-28 transition-[padding-top] duration-200 genie-page-container relative z-10"
              style={{ paddingTop: "calc(var(--app-header-height, 68px) + 0.5mm)" }}
            >
              <MacTabHeader />
              {children}
            </main>
            {/* Foreground In-App Application Window Layer (z-[9999]) */}
            <MacWindowOverlay />
            {/* macOS Style Bottom Navigation Dock - Floats in foreground (z-[10001]) for quick switching */}
            <BottomNavbar />
            {/* Master Shared Liquid Glass Card Shader Host (Extracted from liquid-glass.html) */}
            <LiquidGlassCardShader />
            <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-md py-4 text-center text-xs text-slate-500 mb-16 sm:mb-20">
              AshraySetu • Government of Odisha & District Disaster Management
              Authority, Kendrapara
            </footer>
          </div>
        </MacWindowProvider>
      </body>
    </html>
  );
}
