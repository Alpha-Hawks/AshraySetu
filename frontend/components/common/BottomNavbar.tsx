"use client";

import React, { useState, useEffect } from "react";
import { SpotlightNavbar, type NavItem } from "@/components/ui/spotlight-navbar";
import { translations, type Language } from "@/lib/locales/translations";

export function BottomNavbar() {
  const [lang, setLang] = useState<Language>("en");
  const [isQrGenerating, setIsQrGenerating] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("ashraysetu_lang") as Language;
    if (savedLang) setLang(savedLang);

    const handleLang = () => {
      const updated = localStorage.getItem("ashraysetu_lang") as Language;
      if (updated) setLang(updated);
    };

    const handleQrState = (e: any) => {
      setIsQrGenerating(Boolean(e.detail?.isGenerating));
    };

    window.addEventListener("languageChanged", handleLang);
    window.addEventListener("qrGeneratingState", handleQrState);
    return () => {
      window.removeEventListener("languageChanged", handleLang);
      window.removeEventListener("qrGeneratingState", handleQrState);
    };
  }, []);

  // Remove navbar completely when QR is generating/printing
  if (isQrGenerating) {
    return null;
  }

  const t = translations[lang];

  const navLinks: NavItem[] = [
    { href: "/intake", label: t.navIntake },
    { href: "/inventory", label: t.navInventory },
    { href: "/scan", label: t.navScan },
    { href: "/map", label: t.navMap },
    { href: "/dashboard", label: t.navDashboard },
    { href: "/andhra-pradesh", label: t.navAP },
    { href: "/admin/dashboard", label: t.navAdmin || "Admin Live" },
  ];

  return (
    <aside
      data-view-transition="app-shell"
      aria-label="Application Dock Navigation"
      className="fixed bottom-3 sm:bottom-4 inset-x-0 mx-auto z-[10001] flex justify-center pointer-events-none px-2 sm:px-4 genie-app-shell transition-all duration-300"
    >
      <div className="pointer-events-auto max-w-[calc(100vw-1rem)] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
        <SpotlightNavbar items={navLinks} className="pt-0" />
      </div>
    </aside>
  );
}

export default BottomNavbar;
