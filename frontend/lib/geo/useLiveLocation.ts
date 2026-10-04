// React hook for live location consumption via useSyncExternalStore
"use client";

import { useSyncExternalStore, useCallback } from "react";
import {
  liveLocationStore,
  type LiveLocationState,
} from "./liveLocationStore.ts";

export function useLiveLocation(): LiveLocationState & {
  startTracking: () => void;
  requestPermissionAndStart: () => void;
  pauseTracking: () => void;
  resumeTracking: () => void;
  stopTracking: () => void;
  setFollow: (follow: boolean) => void;
  recenter: () => void;
  setPowerMode: (lowPower: boolean) => void;
  startFallbackQuery: () => void;
  selectManualFallbackPoint: (lat: number, lng: number) => void;
} {
  const state = useSyncExternalStore(
    liveLocationStore.subscribe,
    liveLocationStore.getSnapshot,
    liveLocationStore.getServerSnapshot
  );

  const startTracking = useCallback(() => liveLocationStore.startTracking(), []);
  const requestPermissionAndStart = useCallback(() => liveLocationStore.requestPermissionAndStart(), []);
  const pauseTracking = useCallback(() => liveLocationStore.pauseTracking(), []);
  const resumeTracking = useCallback(() => liveLocationStore.resumeTracking(), []);
  const stopTracking = useCallback(() => liveLocationStore.stopTracking(), []);
  const setFollow = useCallback((f: boolean) => liveLocationStore.setFollow(f), []);
  const recenter = useCallback(() => liveLocationStore.recenter(), []);
  const setPowerMode = useCallback((lp: boolean) => liveLocationStore.setPowerMode(lp), []);
  const startFallbackQuery = useCallback(() => liveLocationStore.startFallbackQuery(), []);
  const selectManualFallbackPoint = useCallback(
    (lat: number, lng: number) => liveLocationStore.selectManualFallbackPoint(lat, lng),
    []
  );

  return {
    ...state,
    startTracking,
    requestPermissionAndStart,
    pauseTracking,
    resumeTracking,
    stopTracking,
    setFollow,
    recenter,
    setPowerMode,
    startFallbackQuery,
    selectManualFallbackPoint,
  };
}
