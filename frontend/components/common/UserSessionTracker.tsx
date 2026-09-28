"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let sessId = sessionStorage.getItem("ashraysetu_session_id");
    if (!sessId) {
      sessId = `sess_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
      sessionStorage.setItem("ashraysetu_session_id", sessId);
    }
    return sessId;
  } catch {
    return `sess_${Math.random().toString(36).substring(2, 9)}`;
  }
}

function getRouteActivity(pathname: string): string {
  if (pathname === "/scan") return "At Gate / Using QR Scanner";
  if (pathname === "/intake") return "Evacuee Intake Registration";
  if (pathname === "/map") return "Monitoring Shelter & Flood Map";
  if (pathname === "/inventory") return "Checking Relief Supply Inventory";
  if (pathname.startsWith("/andhra-pradesh")) return "AP Cyclone Coastal Protocol";
  if (pathname.startsWith("/admin")) return "Command Center Management";
  if (pathname === "/dashboard") return "Disaster Monitoring Dashboard";
  if (pathname === "/") return "Citizen Disaster Portal";
  return `Viewing ${pathname}`;
}

export default function UserSessionTracker() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sendHeartbeat = async (extra?: { isScannerActive?: boolean }) => {
    if (typeof window === "undefined") return;
    const sessionId = sessionIdRef.current || getSessionId();
    sessionIdRef.current = sessionId;

    const isScannerActive =
      extra?.isScannerActive !== undefined
        ? extra.isScannerActive
        : pathname === "/scan" &&
          Boolean(document.querySelector("#qr-camera-viewport video"));

    const payload = {
      sessionId,
      currentPath: pathname || "/",
      activity: getRouteActivity(pathname || "/"),
      isScannerActive,
      deviceType:
        typeof navigator !== "undefined" && /Mobi|Android|iPhone/i.test(navigator.userAgent)
          ? "Mobile Device"
          : "Desktop / Workstation",
    };

    try {
      await fetch("/api/presence/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Ignore background presence failures
    }
  };

  useEffect(() => {
    sessionIdRef.current = getSessionId();

    // Send immediate heartbeat on route load
    sendHeartbeat();

    // Listen for custom scanner state events from the scan page
    const handleScannerState = (e: any) => {
      sendHeartbeat({ isScannerActive: Boolean(e.detail?.active) });
    };
    window.addEventListener("ashraysetu_scanner_state", handleScannerState);

    // Heartbeat every 15 seconds
    intervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 15000);

    // Visibility change handling
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Send departure beacon on unload
    const handleUnload = () => {
      const sessionId = sessionIdRef.current;
      if (sessionId && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/presence/leave",
          JSON.stringify({ sessionId })
        );
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("ashraysetu_scanner_state", handleScannerState);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [pathname]);

  return null;
}
