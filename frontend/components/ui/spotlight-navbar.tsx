"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion, animate } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMacWindow } from "@/lib/window/MacWindowManager";

export interface NavItem {
    label: string;
    href: string;
}

export interface SpotlightNavbarProps {
    items?: NavItem[];
    className?: string;
    onItemClick?: (item: NavItem, index: number) => void;
    defaultActiveIndex?: number;
}

const DEFAULT_ITEMS: NavItem[] = [
    { label: "Household Intake", href: "/intake" },
    { label: "Shelter Stocks", href: "/inventory" },
    { label: "Scan Pass", href: "/scan" },
    { label: "Spatial Map", href: "/map" },
    { label: "Command Desk", href: "/dashboard" },
    { label: "Andhra Pradesh Hub", href: "/andhra-pradesh" },
    { label: "Admin Live", href: "/admin/dashboard" },
];

export function SpotlightNavbar({
    items = DEFAULT_ITEMS,
    className,
    onItemClick,
    defaultActiveIndex = -1,
}: SpotlightNavbarProps) {
    const pathname = usePathname();
    const { activeWindow, openWindow } = useMacWindow();
    const navRef = useRef<HTMLDivElement>(null);
    const [hoverX, setHoverX] = useState<number | null>(null);
    const [isDark, setIsDark] = useState(false);
    const [clickedIndex, setClickedIndex] = useState<number | null>(null);

    const [capsuleBounds, setCapsuleBounds] = useState<{
        left: number;
        top: number;
        width: number;
        height: number;
        opacity: number;
    }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

    const [waveKey, setWaveKey] = useState(0);

    // Compute effective path from active foreground window or current pathname
    const effectivePath = activeWindow || pathname;

    // Reset clickedIndex when back on home page without an active window
    useEffect(() => {
        if (pathname === "/" && !activeWindow) {
            setClickedIndex(null);
        }
    }, [pathname, activeWindow]);

    // Compute active index dynamically: -1 on home page unless user clicked a nav button or opened a window
    const activeIndex = useMemo(() => {
        // If user explicitly clicked a nav button, honour it immediately
        if (clickedIndex !== null && clickedIndex >= 0 && clickedIndex < items.length) {
            return clickedIndex;
        }

        // On home page with no active window, no capsule is shown
        if (!effectivePath || effectivePath === "/") {
            return defaultActiveIndex;
        }

        // Exact match first
        const exact = items.findIndex((item) => item.href === effectivePath);
        if (exact !== -1) return exact;

        // Longest prefix match for nested routes (e.g. /andhra-pradesh/history)
        let bestIndex = -1;
        let longestMatch = 0;
        items.forEach((item, index) => {
            if (item.href !== "/" && effectivePath.startsWith(item.href) && item.href.length > longestMatch) {
                bestIndex = index;
                longestMatch = item.href.length;
            }
        });
        return bestIndex !== -1 ? bestIndex : defaultActiveIndex;
    }, [effectivePath, items, defaultActiveIndex, clickedIndex]);

    // Refs for the "light" positions so we can animate them imperatively
    const spotlightX = useRef(0);
    const ambienceX = useRef(0);

    useEffect(() => {
        const checkTheme = () => {
            setIsDark(document.documentElement.classList.contains("dark"));
        };
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!navRef.current) return;
        const nav = navRef.current;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = nav.getBoundingClientRect();
            const x = e.clientX - rect.left;
            setHoverX(x);
            // Direct update for immediate feedback (no spring for the mouse itself, feels snappier)
            spotlightX.current = x;
            nav.style.setProperty("--spotlight-x", `${x}px`);
        };

        const handleMouseLeave = () => {
            setHoverX(null);
            if (activeIndex < 0) return;
            // When mouse leaves, spring the spotlight back to the active item
            const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);
            if (activeItem) {
                const navRect = nav.getBoundingClientRect();
                const itemRect = activeItem.getBoundingClientRect();
                const targetX = itemRect.left - navRect.left + itemRect.width / 2;

                animate(spotlightX.current, targetX, {
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

        nav.addEventListener("mousemove", handleMouseMove);
        nav.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            nav.removeEventListener("mousemove", handleMouseMove);
            nav.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [activeIndex]);

    // Handle the "Ambience" (Active Item) Movement
    useEffect(() => {
        if (!navRef.current) return;
        const nav = navRef.current;
        if (activeIndex < 0) return;
        const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);

        if (activeItem) {
            const navRect = nav.getBoundingClientRect();
            const itemRect = activeItem.getBoundingClientRect();
            const targetX = itemRect.left - navRect.left + itemRect.width / 2;

            animate(ambienceX.current, targetX, {
                type: "spring",
                stiffness: 200,
                damping: 20,
                onUpdate: (v) => {
                    ambienceX.current = v;
                    nav.style.setProperty("--ambience-x", `${v}px`);
                },
            });
        }
    }, [activeIndex]);

    // Handle Separate Sliding Liquid Glass Capsule Movement
    useEffect(() => {
        if (!navRef.current) return;
        const nav = navRef.current;

        if (activeIndex < 0) {
            setCapsuleBounds((prev) => ({ ...prev, opacity: 0 }));
            return;
        }

        const updateCapsule = () => {
            const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null;
            if (activeItem) {
                const navRect = nav.getBoundingClientRect();
                const itemRect = activeItem.getBoundingClientRect();
                setCapsuleBounds({
                    left: itemRect.left - navRect.left,
                    top: itemRect.top - navRect.top,
                    width: itemRect.width,
                    height: itemRect.height,
                    opacity: 1,
                });
            } else {
                setCapsuleBounds((prev) => ({ ...prev, opacity: 0 }));
            }
        };

        // Measure immediately and after microtask
        updateCapsule();
        const frameId = requestAnimationFrame(updateCapsule);

        // Retrigger wave sweep on every navigation position
        setWaveKey((prev) => prev + 1);

        window.addEventListener("resize", updateCapsule);
        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener("resize", updateCapsule);
        };
    }, [activeIndex, items]);

    return (
        <div className={cn("relative flex justify-center", className)}>
            <nav
                ref={navRef}
                className={cn(
                    "liquid-glass-material liquid-glass-navbar relative h-12 sm:h-11 rounded-full transition-all duration-300 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-w-[calc(100vw-1.5rem)]"
                )}
            >

                {/* Separate Sliding Liquid Glass Capsule Button */}
                {capsuleBounds.opacity > 0 && activeIndex >= 0 && (
                    <motion.div
                        className={cn(
                            "absolute rounded-full pointer-events-none z-[5]",
                            "figma-ocean-wave-btn figma-sliding-capsule"
                        )}
                        initial={false}
                        animate={{
                            x: capsuleBounds.left,
                            y: capsuleBounds.top,
                            width: capsuleBounds.width,
                            height: capsuleBounds.height,
                            opacity: capsuleBounds.opacity,
                        }}
                        transition={{
                            x: { type: "spring", stiffness: 240, damping: 24, mass: 0.85 },
                            width: { type: "spring", stiffness: 270, damping: 25, mass: 0.7 },
                            height: { duration: 0.15 },
                            opacity: { duration: 0.2 },
                        }}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                        }}
                    >
                        {/* Figma Liquid Glass Ocean Wave Animation Components (replays on each navigation) */}
                        <span key={`wave-${waveKey}`} className="figma-wave-capsule figma-wave-animating" aria-hidden="true">
                            <span className="figma-wave-meniscus" />
                        </span>
                        <span key={`shock1-${waveKey}`} className="figma-wave-shockwave figma-wave-animating" aria-hidden="true" />
                        <span key={`shock2-${waveKey}`} className="figma-wave-shockwave-2 figma-wave-animating" aria-hidden="true" />
                    </motion.div>
                )}

                {/* Content */}
                <ul className="relative flex items-center h-full px-2 gap-1.5 z-[20]">
                    {items.map((item, idx) => (
                        <li key={idx} className="relative h-full flex items-center justify-center">
                            <a
                                href={item.href}
                                data-index={idx}
                                data-genie-origin={item.href}
                                data-window-origin={item.href}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setClickedIndex(idx);
                                    openWindow(item.href, e.currentTarget);
                                    onItemClick?.(item, idx);
                                }}
                                className={cn(
                                    "px-3.5 py-1.5 text-xs transition-colors duration-200 rounded-full cursor-pointer select-none whitespace-nowrap relative z-[20]",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]",
                                    activeIndex === idx
                                        ? "!text-black font-black"
                                        : "!text-black hover:!text-black font-bold hover:bg-black/[0.06] active:scale-95"
                                )}
                            >
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>

                {/* LIGHTING LAYERS 
           We use CSS variables --spotlight-x and --ambience-x updated by JS
        */}

                {/* 1. The Moving Spotlight (Follows Mouse with Specular Refraction) */}
                <div
                    className="pointer-events-none absolute bottom-0 left-0 w-full h-full z-[2] opacity-0 transition-opacity duration-300"
                    style={{
                        opacity: hoverX !== null ? 1 : 0,
                        background: `
              radial-gradient(
                130px circle at var(--spotlight-x) 100%, 
                rgba(0,122,255,0.18) 0%, 
                rgba(255,255,255,0.2) 35%,
                transparent 65%
              )
            `,
                    }}
                />

                {/* 2. The Active State Ambience (Stays on Active Item with luminous caustic bloom) */}
                {activeIndex >= 0 && (
                    <div
                        className="pointer-events-none absolute bottom-0 left-0 w-full h-[3px] z-[3] transition-opacity duration-300"
                        style={{
                            background: `
                      radial-gradient(
                        80px circle at var(--ambience-x) 0%, 
                        rgba(0,122,255,0.95) 0%, 
                        rgba(0,122,255,0.3) 60%,
                        transparent 100%
                      )
                    `,
                        }}
                    />
                )}
            </nav>

            {/* STYLE BLOCK for Dynamic Colors */}
            <style jsx>{`
                nav {
                    --spotlight-color: rgba(0, 122, 255, 0.12);
                    --ambience-color: rgba(0, 122, 255, 0.85);
                }
            `}</style>
        </div>
    );
}

export default SpotlightNavbar;
