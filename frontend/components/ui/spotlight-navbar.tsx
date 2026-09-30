"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { animate } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Users,
  Package,
  QrCode,
  MapPin,
  LayoutDashboard,
  Waves,
  ShieldCheck,
} from "lucide-react";
import { translations, type Language } from "@/lib/locales/translations";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export function SpotlightNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLDivElement>(null);

  const [lang, setLang] = useState<Language>("en");
  const [isHovered, setIsHovered] = useState(false);

  // Imperative refs for spring-animated CSS variables (avoids React re-renders on every frame)
  const spotlightX = useRef(0);
  const ambienceX = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem("ashraysetu_lang") as Language;
    if (saved) setLang(saved);
    const handler = () => {
      const l = localStorage.getItem("ashraysetu_lang") as Language;
      if (l) setLang(l);
    };
    window.addEventListener("languageChanged", handler);
    return () => window.removeEventListener("languageChanged", handler);
  }, []);

  const t = translations[lang];

  const navItems: NavItem[] = [
    { href: "/intake",          label: t.navIntake,        icon: Users },
    { href: "/inventory",       label: t.navInventory,     icon: Package },
    { href: "/scan",            label: t.navScan,          icon: QrCode },
    { href: "/map",             label: t.navMap,           icon: MapPin },
    { href: "/dashboard",       label: t.navDashboard,     icon: LayoutDashboard },
    { href: "/andhra-pradesh",  label: t.navAP,            icon: Waves,       badge: "AP" },
    { href: "/admin/dashboard", label: t.navAdmin || "Admin Live", icon: ShieldCheck, badge: "LIVE" },
  ];

  // Derive active index from pathname
  const activeIndex = (() => {
    // Exact match first, then prefix match
    const exact = navItems.findIndex((n) => n.href === pathname);
    if (exact !== -1) return exact;
    // Longest prefix wins
    let best = -1;
    let bestLen = 0;
    navItems.forEach((n, i) => {
      if (n.href !== "/" && pathname.startsWith(n.href) && n.href.length > bestLen) {
        best = i;
        bestLen = n.href.length;
      }
    });
    return best === -1 ? 0 : best;
  })();

  // ── Mouse tracking → spotlight follows cursor live without re-rendering component ─
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const onEnter = () => {
      setIsHovered(true);
    };

    const onMove = (e: MouseEvent) => {
      const rect = nav.getBoundingClientRect();
      const x = e.clientX - rect.left;
      spotlightX.current = x;
      nav.style.setProperty("--spotlight-x", `${x}px`);
    };

    const onLeave = () => {
      setIsHovered(false);
      // Spring back to active item
      const activeEl = nav.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
      if (activeEl) {
        const navRect = nav.getBoundingClientRect();
        const itemRect = activeEl.getBoundingClientRect();
        const target = itemRect.left - navRect.left + itemRect.width / 2;
        animate(spotlightX.current, target, {
          type: "spring",
          stiffness: 200,
          damping: 20,
          onUpdate: (v) => {
            spotlightX.current = v;
            nav.style.setProperty("--spotlight-x", `${v}px`);
          },
        });
      }
    };

    nav.addEventListener("mouseenter", onEnter);
    nav.addEventListener("mousemove", onMove);
    nav.addEventListener("mouseleave", onLeave);
    return () => {
      nav.removeEventListener("mouseenter", onEnter);
      nav.removeEventListener("mousemove", onMove);
      nav.removeEventListener("mouseleave", onLeave);
    };
  }, [activeIndex]);

  // ── Active item ambience dot springs to the active tab ──────────────────
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    // Wait one frame so the DOM has rendered the active item
    requestAnimationFrame(() => {
      const activeEl = nav.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
      if (!activeEl) return;
      const navRect = nav.getBoundingClientRect();
      const itemRect = activeEl.getBoundingClientRect();
      const target = itemRect.left - navRect.left + itemRect.width / 2;

      animate(ambienceX.current, target, {
        type: "spring",
        stiffness: 220,
        damping: 22,
        onUpdate: (v) => {
          ambienceX.current = v;
          nav.style.setProperty("--ambience-x", `${v}px`);
        },
      });
    });
  }, [activeIndex]);

  return (
    <div
      ref={navRef}
      className="relative flex items-center"
      /* CSS variables updated imperatively by JS – no re-renders */
      style={{ "--spotlight-x": "50%", "--ambience-x": "50%" } as React.CSSProperties}
    >
      {/* ── Nav items ────────────────────────────────────────────── */}
      <ul className="relative flex items-center h-full px-1 gap-0 z-10">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = idx === activeIndex;
          return (
            <li key={item.href} className="relative h-full flex items-center">
              <Link
                href={item.href}
                data-index={idx}
                onClick={(e) => {
                  // Instantaneous Next.js App Router client navigation on normal click
                  if (
                    !e.defaultPrevented &&
                    e.button === 0 &&
                    !e.metaKey &&
                    !e.ctrlKey &&
                    !e.altKey &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();
                    router.push(item.href);
                  }
                }}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer select-none",
                  "text-xs font-semibold whitespace-nowrap transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                  isActive
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 pointer-events-none" />
                <span className="pointer-events-none">{item.label}</span>
                {item.badge && (
                  <span
                    className={cn(
                      "ml-0.5 px-1.5 py-px rounded text-[9px] font-black pointer-events-none",
                      item.badge === "LIVE" || item.badge === "EOC"
                        ? "bg-red-500/30 text-red-300 border border-red-500/40"
                        : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* ── Spotlight (follows mouse) ─────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-full transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(
            110px circle at var(--spotlight-x) 100%,
            rgba(56,189,248,0.13) 0%,
            transparent 60%
          )`,
        }}
      />

      {/* ── Active ambience underline beam ───────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 w-full h-[2px] z-[2]"
        style={{
          background: `radial-gradient(
            60px circle at var(--ambience-x) 0%,
            rgba(56,189,248,0.9) 0%,
            transparent 100%
          )`,
        }}
      />
    </div>
  );
}
