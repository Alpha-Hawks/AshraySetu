// React hook for live navigation state consumption via useSyncExternalStore
"use client";

import { useSyncExternalStore, useCallback } from "react";
import {
  liveNavigationStore,
  type LiveNavigationState,
} from "./liveNavigationStore.ts";
import type { Profile } from "../routing/types.ts";
import type { RankedCandidate } from "./safeShelter.ts";

export function useLiveNavigation(): LiveNavigationState & {
  setProfile: (profile: Profile) => void;
  optInOnlineRouting: () => void;
  turnOffOnlineRouting: () => void;
  pinShelter: (id: string) => void;
  unpinShelter: () => void;
  switchTarget: (candidate: RankedCandidate) => void;
  toggleBatterySaver: () => void;
  toggleKeepScreenOn: () => Promise<void>;
  undoArrival: () => void;
  requestFitRoute: () => void;
} {
  const state = useSyncExternalStore(
    liveNavigationStore.subscribe,
    liveNavigationStore.getSnapshot,
    liveNavigationStore.getServerSnapshot
  );

  const setProfile = useCallback(
    (profile: Profile) => liveNavigationStore.setProfile(profile),
    []
  );
  const optInOnlineRouting = useCallback(
    () => liveNavigationStore.optInOnlineRouting(),
    []
  );
  const turnOffOnlineRouting = useCallback(
    () => liveNavigationStore.turnOffOnlineRouting(),
    []
  );
  const pinShelter = useCallback(
    (id: string) => liveNavigationStore.pinShelter(id),
    []
  );
  const unpinShelter = useCallback(
    () => liveNavigationStore.unpinShelter(),
    []
  );
  const switchTarget = useCallback(
    (candidate: RankedCandidate) => liveNavigationStore.switchTarget(candidate),
    []
  );
  const toggleBatterySaver = useCallback(
    () => liveNavigationStore.toggleBatterySaver(),
    []
  );
  const toggleKeepScreenOn = useCallback(
    () => liveNavigationStore.toggleKeepScreenOn(),
    []
  );
  const undoArrival = useCallback(() => liveNavigationStore.undoArrival(), []);
  const requestFitRoute = useCallback(
    () => liveNavigationStore.requestFitRoute(),
    []
  );

  return {
    ...state,
    setProfile,
    optInOnlineRouting,
    turnOffOnlineRouting,
    pinShelter,
    unpinShelter,
    switchTarget,
    toggleBatterySaver,
    toggleKeepScreenOn,
    undoArrival,
    requestFitRoute,
  };
}
