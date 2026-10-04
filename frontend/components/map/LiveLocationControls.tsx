// Map overlay controls: Locate/Recenter button stack and top status pill (FR-U3)
"use client";

import React from "react";
import {
  LocateFixed,
  Locate,
  LocateOff,
  Pause,
  Play,
  Compass as CompassIcon,
  Navigation,
} from "lucide-react";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { useLiveNavigation } from "@/lib/geo/useLiveNavigation";
import { formatDistanceDisplay, formatDurationDisplay } from "@/lib/geo/navMath";

interface LiveLocationControlsProps {
  onScrollToConsent?: () => void;
  onScrollToPanel?: () => void;
}

export default function LiveLocationControls({
  onScrollToConsent,
  onScrollToPanel,
}: LiveLocationControlsProps) {
  const {
    permission,
    tracking,
    follow,
    setFollow,
    currentFix,
    pauseTracking,
    resumeTracking,
  } = useLiveLocation();

  const {
    target,
    guidanceMode,
    routeProgress,
    straightLine,
    isArrived,
    isOffline,
  } = useLiveNavigation();

  const isTracking = tracking === "tracking";
  const isLocating = tracking === "locating";
  const isPaused = tracking === "paused";

  const handleLocateClick = () => {
    if (permission !== "granted" || tracking === "idle" || tracking === "error") {
      onScrollToConsent?.();
      return;
    }

    // Toggle or restore follow-me
    setFollow(true);
  };

  // Status Pill content
  let statusText = "GPS Offline";
  let subText: string | null = null;

  if (permission === "prompt" || tracking === "idle") {
    statusText = "Location Off";
  } else if (isLocating) {
    statusText = "Searching for GPS…";
  } else if (isPaused) {
    statusText = "Tracking Paused";
  } else if (isArrived && target) {
    statusText = `Arrived at ${target.shelter.name}`;
  } else if (target) {
    statusText = target.shelter.name;
    if (
      (guidanceMode === "routed" || guidanceMode === "cachedRoute") &&
      routeProgress
    ) {
      const distStr = formatDistanceDisplay(routeProgress.remainingDistanceM);
      const timeStr = formatDurationDisplay(routeProgress.remainingDurationS);
      subText = `${distStr} • ${timeStr}${guidanceMode === "cachedRoute" ? " (Cached)" : ""}`;
    } else if (straightLine) {
      const distStr = formatDistanceDisplay(straightLine.distanceM);
      const cardStr = straightLine.cardinalKey;
      const walkTimeStr = straightLine.durationS
        ? ` • at least ${formatDurationDisplay(straightLine.durationS)}`
        : "";
      subText = `Direct ${distStr} ${cardStr}${walkTimeStr}`;
    }
  } else if (currentFix) {
    statusText = `GPS Active (±${Math.round(currentFix.accuracyM)}m)`;
  }

  return (
    <>
      {/* 1. Status Pill: Top left-14 to right-[72px] */}
      <div className="absolute top-3 left-14 right-[72px] z-[1000] pointer-events-auto">
        <button
          type="button"
          onClick={onScrollToPanel}
          className="w-full min-h-12 px-4 py-2 rounded-full glass-l1 !bg-white/90 ![backdrop-filter:none] ![-webkit-backdrop-filter:none] shadow-md border border-white/80 flex items-center justify-between text-left cursor-pointer transition active:scale-98"
          title="View safe shelter details and navigation"
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isArrived
                  ? "bg-emerald-500 shadow-[0_0_8px_#10B981]"
                  : isTracking
                  ? "bg-[#007AFF] shadow-[0_0_8px_#007AFF] animate-pulse"
                  : isLocating
                  ? "bg-amber-400 animate-ping"
                  : "bg-slate-400"
              }`}
            />
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {statusText}
              </div>
              {subText && (
                <div className="text-xs sm:text-sm font-semibold text-slate-600 truncate">
                  {subText}
                </div>
              )}
            </div>
          </div>

          <Navigation className="w-4 h-4 text-[#007AFF] shrink-0" />
        </button>
      </div>

      {/* 2. Control Stack: Top right-3 */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-auto">
        {/* Locate / Recenter */}
        <button
          id="btn-map-locate"
          type="button"
          onClick={handleLocateClick}
          aria-pressed={follow}
          aria-label={
            follow
              ? "Map following your location"
              : "Re-center map on your location"
          }
          className="w-12 h-12 rounded-full glass-l1 !bg-white/90 ![backdrop-filter:none] ![-webkit-backdrop-filter:none] shadow-md border border-white/80 flex items-center justify-center text-slate-900 hover:text-[#007AFF] active:scale-95 transition cursor-pointer"
          title={
            follow
              ? "Following device location"
              : "Re-center on device location"
          }
        >
          {isTracking && follow ? (
            <LocateFixed className="w-5 h-5 text-[#007AFF]" />
          ) : isTracking ? (
            <Locate className="w-5 h-5 text-slate-700" />
          ) : (
            <LocateOff className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {/* Pause / Resume Tracking */}
        {(isTracking || isPaused) && (
          <button
            type="button"
            onClick={isPaused ? resumeTracking : pauseTracking}
            aria-label={isPaused ? "Resume tracking" : "Pause tracking"}
            className="w-12 h-12 rounded-full glass-l1 !bg-white/90 ![backdrop-filter:none] ![-webkit-backdrop-filter:none] shadow-md border border-white/80 flex items-center justify-center text-slate-900 hover:text-[#007AFF] active:scale-95 transition cursor-pointer"
            title={isPaused ? "Resume GPS Tracking" : "Pause GPS Tracking"}
          >
            {isPaused ? (
              <Play className="w-5 h-5 text-emerald-600 ml-0.5" />
            ) : (
              <Pause className="w-5 h-5 text-slate-700" />
            )}
          </button>
        )}
      </div>
    </>
  );
}
