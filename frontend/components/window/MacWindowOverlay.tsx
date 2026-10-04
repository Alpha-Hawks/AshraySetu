"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Package,
  QrCode,
  MapPin,
  LayoutDashboard,
  Waves,
  ShieldCheck,
  X,
  Maximize2,
  Minimize2,
  Loader2,
} from "lucide-react";
import { useMacWindow, SUPPORTED_WINDOW_ROUTES } from "@/lib/window/MacWindowManager";
import { buildGenieKeyframes, buildGenieCloseKeyframes } from "@/genie/buildGenieKeyframes";
import { resolveOriginForRoute, toSimpleRect } from "@/genie/originStore";
import { triggerDockLaunchPop } from "@/genie/useGenieNavigate";
import { cn } from "@/lib/utils";

// Dynamic imports for page components with loading spinners
const IntakePage = dynamic(() => import("@/app/(field)/intake/page"), {
  loading: () => <WindowPageLoader title="Household Evacuation Intake" />,
  ssr: false,
});
const InventoryPage = dynamic(() => import("@/app/(field)/inventory/page"), {
  loading: () => <WindowPageLoader title="Shelter Stocks & Rations" />,
  ssr: false,
});
const ScanPage = dynamic(() => import("@/app/(field)/scan/page"), {
  loading: () => <WindowPageLoader title="Optical QR Triage Gate" />,
  ssr: false,
});
const MapPage = dynamic(() => import("@/app/(field)/map/page"), {
  loading: () => <WindowPageLoader title="GIS Vector Topology" />,
  ssr: false,
});
const DashboardPage = dynamic(() => import("@/app/(admin)/dashboard/page"), {
  loading: () => <WindowPageLoader title="DEOC Incident Command Desk" />,
  ssr: false,
});
const AndhraPradeshPage = dynamic(() => import("@/app/andhra-pradesh/page"), {
  loading: () => <WindowPageLoader title="Andhra Pradesh State Coordination Hub" />,
  ssr: false,
});
const AdminDashboardPage = dynamic(() => import("@/app/admin/dashboard/page"), {
  loading: () => <WindowPageLoader title="Administrative Oversight" />,
  ssr: false,
});

function WindowPageLoader({ title }: { title: string }) {
  return (
    <div className="w-full min-h-[420px] flex flex-col items-center justify-center gap-3 text-slate-500 py-16">
      <div className="w-10 h-10 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-center shadow-sm">
        <Loader2 className="w-5 h-5 text-[#007AFF] animate-spin" />
      </div>
      <p className="text-xs font-semibold text-slate-700 tracking-wide">
        Loading {title}...
      </p>
    </div>
  );
}

const ROUTE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/intake": Users,
  "/inventory": Package,
  "/scan": QrCode,
  "/map": MapPin,
  "/dashboard": LayoutDashboard,
  "/andhra-pradesh": Waves,
  "/admin/dashboard": ShieldCheck,
};

export function MacWindowOverlay() {
  const { activeWindow, originRect, closeWindow, registerCloseHandler, isWindowOpen } = useMacWindow();
  const [isZoomed, setIsZoomed] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const activeAnimationRef = useRef<Animation | null>(null);
  const previousPathRef = useRef<string | null>(null);

  const activeConfig = useMemo(() => {
    if (!activeWindow) return null;
    return (
      SUPPORTED_WINDOW_ROUTES.find(
        (r) => r.path === activeWindow || activeWindow.startsWith(r.path)
      ) || {
        path: activeWindow,
        label: "Application Window",
        category: "AshraySetu Workspace",
      }
    );
  }, [activeWindow]);

  const Icon = activeConfig ? ROUTE_ICONS[activeConfig.path] || LayoutDashboard : LayoutDashboard;

  // Execute authentic macOS Curved S-Funnel Genie opening animation on mount
  useLayoutEffect(() => {
    if (!isWindowOpen || !windowRef.current || !activeConfig) return;
    const windowEl = windowRef.current;

    // Reset closing state
    setIsClosing(false);

    // Cancel any previous animation
    if (activeAnimationRef.current) {
      try {
        activeAnimationRef.current.cancel();
      } catch {}
    }

    const box = toSimpleRect(windowEl.getBoundingClientRect());
    const origin = originRect ? toSimpleRect(originRect) : resolveOriginForRoute(activeConfig.path);

    // Build the SVG S-curve funnel keyframes
    const keyframes = buildGenieKeyframes(origin, box, {
      edge: "bottom",
      frameCount: 32,
      streamTranslationFactor: 0.22,
      dropShadow: true,
    });

    // Trigger dock launch pop on origin element
    const dockEl = document.querySelector<HTMLElement>(`[data-genie-origin="${activeConfig.path}"]`);
    if (dockEl) {
      triggerDockLaunchPop(dockEl);
    }

    const isSwitching = previousPathRef.current !== null && previousPathRef.current !== activeConfig.path;
    previousPathRef.current = activeConfig.path;
    const duration = isSwitching ? 460 : 620;

    const anim = windowEl.animate(keyframes as any, {
      duration,
      easing: "linear",
      fill: "forwards",
    });

    activeAnimationRef.current = anim;

    anim.onfinish = () => {
      // Clear clipPath and transform once opened so overflow-y-auto scrolling is completely native
      windowEl.style.clipPath = "none";
      windowEl.style.transform = "none";
    };

    return () => {
      try {
        anim.cancel();
      } catch {}
    };
  }, [isWindowOpen, activeConfig, originRect]);

  // Execute authentic macOS Reverse Genie closing animation into the dock
  const handleClose = useCallback(() => {
    if (isClosing) return;
    if (!windowRef.current || !activeConfig) {
      closeWindow();
      return;
    }

    const windowEl = windowRef.current;
    const box = toSimpleRect(windowEl.getBoundingClientRect());
    const origin = originRect ? toSimpleRect(originRect) : resolveOriginForRoute(activeConfig.path);

    const closeKeyframes = buildGenieCloseKeyframes(origin, box, {
      edge: "bottom",
      frameCount: 30,
      streamTranslationFactor: 0.22,
    });

    setIsClosing(true);

    if (typeof document !== "undefined" && "startViewTransition" in document) {
      try {
        (document as any).startViewTransition();
      } catch {}
    }

    // Trigger dock absorption pop as funnel reaches dock
    const dockEl = document.querySelector<HTMLElement>(`[data-genie-origin="${activeConfig.path}"]`);
    if (dockEl) {
      setTimeout(() => triggerDockLaunchPop(dockEl), 300);
    }

    if (activeAnimationRef.current) {
      try {
        activeAnimationRef.current.cancel();
      } catch {}
    }

    const anim = windowEl.animate(closeKeyframes as any, {
      duration: 520,
      easing: "linear",
      fill: "forwards",
    });

    activeAnimationRef.current = anim;

    anim.onfinish = () => {
      previousPathRef.current = null;
      setIsClosing(false);
      closeWindow();
    };
  }, [isClosing, activeConfig, originRect, closeWindow]);

  // Register handleClose with MacWindowManager so dock toggles and escape key use reverse genie
  useEffect(() => {
    registerCloseHandler(handleClose);
    return () => registerCloseHandler(() => {});
  }, [handleClose, registerCloseHandler]);

  // Listen to Escape key to trigger reverse Genie close
  useEffect(() => {
    if (!isWindowOpen || isClosing) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
          e.preventDefault();
          handleClose();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isWindowOpen, isClosing, handleClose]);

  const renderActivePage = (route: string) => {
    if (route === "/intake" || route.startsWith("/intake")) return <IntakePage />;
    if (route === "/inventory" || route.startsWith("/inventory")) return <InventoryPage />;
    if (route === "/scan" || route.startsWith("/scan")) return <ScanPage />;
    if (route === "/map" || route.startsWith("/map")) return <MapPage />;
    if (route === "/dashboard" || route.startsWith("/dashboard")) return <DashboardPage />;
    if (route === "/andhra-pradesh" || route.startsWith("/andhra-pradesh"))
      return <AndhraPradeshPage />;
    if (route === "/admin/dashboard" || route.startsWith("/admin/dashboard"))
      return <AdminDashboardPage />;
    return <IntakePage />;
  };

  return (
    <AnimatePresence>
      {isWindowOpen && activeConfig && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeConfig.label}
          className="fixed inset-0 z-[9999] flex items-center justify-center pt-2 sm:pt-4 px-2 sm:px-4 md:px-6 pb-20 sm:pb-24 pointer-events-auto"
        >
          {/* 1. LAYERED BACKDROP: Blurs the existing website underneath without replacing it */}
          <motion.div
            key="mac-window-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: isClosing ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            onClick={handleClose}
            className="fixed inset-0 z-0 backdrop-blur-[12px] bg-black/[0.08] dark:bg-black/30 pointer-events-auto"
            aria-hidden="true"
          />

          {/* 2. FOREGROUND APPLICATION WINDOW: Expands out of the bottom dock via SVG S-Curve Genie Funnel */}
          <div
            ref={windowRef}
            key={activeConfig.path}
            className={cn(
              "relative z-10 w-full flex flex-col overflow-hidden will-change-[transform,clip-path]",
              "glass-l2 border-white/60",
              "shadow-[0_28px_80px_-10px_rgba(15,23,42,0.14),0_12px_32px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_2px_rgba(255,255,255,0.9)]",
              isZoomed
                ? "max-w-[99vw] h-[calc(100vh-5.5rem)] rounded-2xl"
                : "max-w-7xl w-[95vw] h-[calc(100vh-6.5rem)] sm:h-[calc(100vh-7rem)] max-h-[880px] rounded-[36px]"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* WINDOW HEADER: Liquid Glass Floating Header Bar */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/40 bg-white/20 backdrop-blur-xl select-none">
              {/* Left: Active Tab Pill with Category & Pulsing Live Dot */}
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full glass-l1 shadow-xs">
                <div className="w-5 h-5 rounded-full glass-l3 flex items-center justify-center text-[#007AFF] shadow-xs">
                  <Icon className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold text-slate-900 tracking-tight">
                  {activeConfig.label}
                </span>
                <span className="hidden sm:inline-block text-[10px] text-slate-600 font-semibold border-l border-slate-300/80 pl-2.5">
                  {activeConfig.category}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5 shadow-[0_0_8px_#10b981]" />
              </div>

              {/* Right: Window Controls (Zoom/Restore + Prominent "Close Tab" Action Pill) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsZoomed((prev) => !prev)}
                  title={isZoomed ? "Restore Window size" : "Expand Window size"}
                  aria-label={isZoomed ? "Restore Window" : "Zoom Window"}
                  className="p-2 rounded-full glass-l1 hover:bg-white/60 text-slate-700 transition shadow-xs flex items-center justify-center cursor-pointer active:scale-95"
                >
                  {isZoomed ? (
                    <Minimize2 className="w-3.5 h-3.5 text-slate-700" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5 text-slate-700" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="group px-3.5 py-1.5 rounded-full glass-l1 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-300 text-slate-800 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
                  title="Close this window and minimize smoothly back to Dock (Esc)"
                >
                  <X className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-600 transition-colors stroke-[2.5]" />
                  <span>Close Tab</span>
                  <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/5 text-slate-600 border border-black/5">
                    Esc
                  </kbd>
                </button>
              </div>
            </div>

            {/* WINDOW CONTENT: Independent scrolling, with slight fade-in delay after window expands */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isClosing ? 0 : 1 }}
              transition={{ delay: isClosing ? 0 : 0.18, duration: 0.28 }}
              className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-32 sm:pb-36 [-webkit-overflow-scrolling:touch]"
              tabIndex={-1}
            >
              <div className="max-w-6xl mx-auto w-full">
                {renderActivePage(activeConfig.path)}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default MacWindowOverlay;
