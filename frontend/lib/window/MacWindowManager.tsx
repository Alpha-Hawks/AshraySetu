"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export interface OriginRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface WindowRouteConfig {
  path: string;
  label: string;
  category: string;
}

export const SUPPORTED_WINDOW_ROUTES: WindowRouteConfig[] = [
  { path: "/intake", label: "Household Intake", category: "Evacuation Intake Ledger" },
  { path: "/inventory", label: "Shelter Stocks", category: "Supplies & Rations Ledger" },
  { path: "/scan", label: "Scan Pass", category: "Optical QR Triage Gate" },
  { path: "/map", label: "Spatial Map", category: "GIS Vector Topology" },
  { path: "/dashboard", label: "Command Desk", category: "DEOC Incident Overview" },
  { path: "/andhra-pradesh", label: "Andhra Pradesh Hub", category: "State Disaster Coordination" },
  { path: "/admin/dashboard", label: "Admin Live", category: "Administrative Oversight" },
];

interface MacWindowContextType {
  activeWindow: string | null;
  originRect: OriginRect | null;
  openWindow: (route: string, sourceElement?: HTMLElement | null) => void;
  closeWindow: () => void;
  requestClose: () => void;
  registerCloseHandler: (handler: () => void) => void;
  isWindowOpen: boolean;
}

const MacWindowContext = createContext<MacWindowContextType | null>(null);

export function MacWindowProvider({ children }: { children: ReactNode }) {
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [originRect, setOriginRect] = useState<OriginRect | null>(null);
  const previousScrollY = useRef(0);
  const initialMountChecked = useRef(false);
  const pathname = usePathname();

  // Helper to resolve origin rect from DOM or fallback to bottom dock center
  const resolveOrigin = useCallback(
    (route: string, sourceElement?: HTMLElement | null): OriginRect => {
      if (sourceElement && typeof sourceElement.getBoundingClientRect === "function") {
        const r = sourceElement.getBoundingClientRect();
        return {
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
        };
      }

      // Try finding the dock item in DOM
      if (typeof document !== "undefined") {
        const dockEl = document.querySelector(
          `[data-genie-origin="${route}"], [data-window-origin="${route}"]`
        );
        if (dockEl) {
          const r = dockEl.getBoundingClientRect();
          return {
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
          };
        }
      }

      // Fallback: bottom-center of viewport (where dock resides)
      const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      const width = 100;
      const height = 40;
      const left = (vw - width) / 2;
      const top = vh - height - 12;
      return {
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height,
        x: left + width / 2,
        y: top + height / 2,
      };
    },
    []
  );

  const closeRequestCallbackRef = useRef<(() => void) | null>(null);

  const registerCloseHandler = useCallback((handler: () => void) => {
    closeRequestCallbackRef.current = handler;
  }, []);

  const closeWindow = useCallback(() => {
    const updateState = () => {
      setActiveWindow(null);
    };

    if (typeof document !== "undefined" && "startViewTransition" in document) {
      (document as any).startViewTransition(updateState);
    } else {
      updateState();
    }

    // Unlock body scroll
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }

    // Restore URL to root (or base route)
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.history.pushState(null, "", "/");
    }
  }, []);

  const requestClose = useCallback(() => {
    if (closeRequestCallbackRef.current) {
      closeRequestCallbackRef.current();
    } else {
      closeWindow();
    }
  }, [closeWindow]);

  const openWindow = useCallback(
    (route: string, sourceElement?: HTMLElement | null) => {
      // Find matching config
      const matched = SUPPORTED_WINDOW_ROUTES.find(
        (r) => r.path === route || (r.path !== "/" && route.startsWith(r.path))
      );
      const targetPath = matched ? matched.path : route;

      // If user clicks the currently active tab on the dock, toggle minimize back into the dock
      if (activeWindow === targetPath) {
        requestClose();
        return;
      }

      const rect = resolveOrigin(targetPath, sourceElement);
      setOriginRect(rect);

      // Lock body scroll and prevent background jumps
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        previousScrollY.current = window.scrollY;
        document.body.style.overflow = "hidden";
        document.body.style.touchAction = "none";
      }

      const updateState = () => {
        setActiveWindow(targetPath);
      };

      if (typeof document !== "undefined" && "startViewTransition" in document) {
        (document as any).startViewTransition(updateState);
      } else {
        updateState();
      }

      // Update URL shallowly so user has copyable link and browser history works
      if (typeof window !== "undefined" && window.location.pathname !== targetPath) {
        window.history.pushState({ inAppWindow: targetPath }, "", targetPath);
      }

      // Focus heading in window for accessibility
      setTimeout(() => {
        const heading = document.querySelector(
          '[role="dialog"] h1, [role="dialog"] [data-view-transition="page"] h1, h1'
        );
        if (heading instanceof HTMLElement) {
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
        }
      }, 180);
    },
    [activeWindow, requestClose, resolveOrigin]
  );

  // Handle direct navigation on initial mount (e.g. visiting /intake directly)
  useEffect(() => {
    if (initialMountChecked.current) return;
    initialMountChecked.current = true;

    if (pathname && pathname !== "/") {
      const isWindowRoute = SUPPORTED_WINDOW_ROUTES.some(
        (r) => r.path === pathname || pathname.startsWith(r.path)
      );
      if (isWindowRoute) {
        // Automatically open as in-app foreground window over current page
        openWindow(pathname);
      }
    }
  }, [pathname, openWindow]);

  // Handle browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const currentPath = window.location.pathname;
      const isWindowRoute = SUPPORTED_WINDOW_ROUTES.some(
        (r) => r.path === currentPath || currentPath.startsWith(r.path)
      );

      if (isWindowRoute) {
        openWindow(currentPath);
      } else if (activeWindow) {
        closeWindow();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeWindow, openWindow, closeWindow]);

  // Handle Escape key to close window
  useEffect(() => {
    if (!activeWindow) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const activeTag = (e.target as HTMLElement)?.tagName;
        if (activeTag !== "INPUT" && activeTag !== "TEXTAREA" && activeTag !== "SELECT") {
          e.preventDefault();
          requestClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeWindow, requestClose]);

  return (
    <MacWindowContext.Provider
      value={{
        activeWindow,
        originRect,
        openWindow,
        closeWindow,
        requestClose,
        registerCloseHandler,
        isWindowOpen: Boolean(activeWindow),
      }}
    >
      {children}
    </MacWindowContext.Provider>
  );
}

export function useMacWindow() {
  const ctx = useContext(MacWindowContext);
  if (!ctx) {
    return {
      activeWindow: null,
      originRect: null,
      openWindow: (route: string) => {
        if (typeof window !== "undefined") window.location.href = route;
      },
      closeWindow: () => {},
      requestClose: () => {},
      registerCloseHandler: () => {},
      isWindowOpen: false,
    };
  }
  return ctx;
}

