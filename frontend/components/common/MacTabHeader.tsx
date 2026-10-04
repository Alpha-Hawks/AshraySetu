"use client";

import React, { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  Users,
  Package,
  QrCode,
  MapPin,
  LayoutDashboard,
  Waves,
  ShieldCheck,
  X,
} from "lucide-react";
import { useGenieNavigate } from "@/genie/useGenieNavigate";
import { useMacWindow } from "@/lib/window/MacWindowManager";

export interface TabConfig {
  path: string;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const TAB_ROUTES: TabConfig[] = [
  {
    path: "/intake",
    label: "Household Intake",
    category: "Evacuation Intake Ledger",
    icon: Users,
  },
  {
    path: "/inventory",
    label: "Shelter Stocks",
    category: "Supplies & Rations Ledger",
    icon: Package,
  },
  {
    path: "/scan",
    label: "Scan Pass",
    category: "Optical QR Triage Gate",
    icon: QrCode,
  },
  {
    path: "/map",
    label: "Spatial Map",
    category: "GIS Vector Topology",
    icon: MapPin,
  },
  {
    path: "/dashboard",
    label: "Command Desk",
    category: "DEOC Incident Overview",
    icon: LayoutDashboard,
  },
  {
    path: "/andhra-pradesh",
    label: "Andhra Pradesh Hub",
    category: "State Disaster Coordination",
    icon: Waves,
  },
  {
    path: "/admin/dashboard",
    label: "Admin Live",
    category: "Administrative Oversight",
    icon: ShieldCheck,
  },
];

export function MacTabHeader() {
  const pathname = usePathname();
  const { closeGenieTab } = useGenieNavigate();
  const { isWindowOpen } = useMacWindow();

  // Find currently active route among the 7 tabs
  const activeTab = useMemo(() => {
    if (!pathname || pathname === "/") return null;
    // Exact match first
    const exact = TAB_ROUTES.find((tab) => tab.path === pathname);
    if (exact) return exact;
    // Prefix match for sub-routes (e.g. /andhra-pradesh/history)
    return TAB_ROUTES.find(
      (tab) => tab.path !== "/" && pathname.startsWith(tab.path)
    ) || null;
  }, [pathname]);

  // Handle keyboard shortcut (Esc to close tab)
  useEffect(() => {
    if (!activeTab || isWindowOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Prevent default only if not in an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
          e.preventDefault();
          closeGenieTab(activeTab.path);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, isWindowOpen, closeGenieTab]);

  const [isQrGenerating, setIsQrGenerating] = React.useState(false);

  useEffect(() => {
    const handleQrState = (e: any) => {
      setIsQrGenerating(Boolean(e.detail?.isGenerating));
    };
    window.addEventListener("qrGeneratingState", handleQrState);
    return () => window.removeEventListener("qrGeneratingState", handleQrState);
  }, []);

  if (!activeTab || isWindowOpen || isQrGenerating) return null;

  const Icon = activeTab.icon;

  const handleClose = () => {
    closeGenieTab(activeTab.path);
  };

  return (
    <div className="mb-5 w-full">
      <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-full glass-l2">
        {/* Left: Active Tab Pill with Category & Pulsing State */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full glass-l1 select-none">
          <div className="w-5 h-5 rounded-full glass-l3 flex items-center justify-center text-[#007AFF] shadow-xs">
            <Icon className="w-3 h-3 stroke-[2.5]" />
          </div>
          <span className="text-xs font-bold text-slate-900 tracking-tight">
            {activeTab.label}
          </span>
          <span className="hidden sm:inline-block text-[10px] text-slate-600 font-semibold border-l border-slate-300/80 pl-2.5">
            {activeTab.category}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5 shadow-[0_0_8px_#10b981]" />
        </div>

        {/* Right: Prominent "Close Tab" Action Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="group px-3.5 py-1.5 rounded-full glass-l1 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-300 text-slate-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            title="Close this tab and minimize smoothly back into Dock"
          >
            <X className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-600 transition-colors stroke-[2.5]" />
            <span>Close Tab</span>
            <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/5 text-slate-600 border border-black/5">
              Esc
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MacTabHeader;
