// Safe Shelter UI Panel (FR-U4, FR-P3, FR-P5, FR-S10, FR-D11)
"use client";

import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  Footprints,
  Car,
  Navigation2,
  Navigation,
  MapPin,
  ExternalLink,
  Phone,
  PhoneCall,
  Lock,
  Battery,
  BatteryCharging,
  Eye,
  Copy,
  Check,
  ArrowRight,
  Compass,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { useLiveNavigation } from "@/lib/geo/useLiveNavigation";
import {
  SHELTERS_GOV_CONFIRMED,
  OCCUPANCY_IS_LIVE,
  INCHARGE_PHONES_VERIFIED,
  MAX_WALK_ADVISE_KM,
  COVERAGE_WARN_KM,
  MAX_ROUTABLE_KM,
} from "@/lib/geo/navConfig";
import {
  formatDistanceDisplay,
  formatDurationDisplay,
  generateGoogleMapsUrl,
  generateAppleMapsUrl,
  generateGeoUri,
} from "@/lib/geo/navMath";
import type { Step } from "@/lib/routing/types";
import { translations, fmt, Language } from "@/lib/locales/translations";
import { cn } from "@/lib/utils";

// Helper for helpline numbers (5.5)
export function HelplineRow({ lang = "en" }: { lang?: Language }) {
  const t = translations[lang] || translations.en;
  return (
    <div className="w-full pt-3 border-t border-slate-200/80">
      <div className="text-[12px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
        Official Emergency Helplines
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <a
          href="tel:112"
          className="min-h-[48px] px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between font-bold text-[14px] hover:bg-rose-100 transition active:scale-98"
          aria-label="Call Emergency 112"
        >
          <span>Emergency</span>
          <span className="font-mono text-base">112</span>
        </a>
        <a
          href="tel:1070"
          className="min-h-[48px] px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 flex items-center justify-between font-bold text-[14px] hover:bg-sky-100 transition active:scale-98"
          aria-label="Call State Control Room 1070"
        >
          <span>State EOC</span>
          <span className="font-mono text-base">1070</span>
        </a>
        <a
          href="tel:1077"
          className="min-h-[48px] px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between font-bold text-[14px] hover:bg-amber-100 transition active:scale-98"
          aria-label="Call District Control Room 1077"
        >
          <span>District EOC</span>
          <span className="font-mono text-base">1077</span>
        </a>
      </div>
    </div>
  );
}

// Storm warning banner (5.5)
export function StormWarningBanner({ lang = "en" }: { lang?: Language }) {
  const t = translations[lang] || translations.en;
  return (
    <div
      role="alert"
      className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-950 flex items-start gap-3 shadow-xs"
    >
      <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
      <p className="text-[14px] sm:text-[15px] font-medium leading-relaxed">
        {t.liveLocStormWarning}
      </p>
    </div>
  );
}

// =========================================================================
// ABOVE-MAP SLOT
// Shows consent, denied, insecure, unsupported, or in-app-browser warnings
// =========================================================================
export function AboveMapSlot({
  onPickPointOnMap,
}: {
  onPickPointOnMap?: () => void;
}) {
  const {
    permission,
    tracking,
    errorReason,
    requestPermissionAndStart,
    isInsecureContext,
    isUnsupported,
    isInAppBrowser,
    startFallbackQuery,
  } = useLiveLocation();

  const [lang, setLang] = useState<Language>("en");
  const [copiedLink, setCopiedLink] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const readLang = () => {
      const saved = localStorage.getItem("ashraysetu_lang") as Language;
      if (saved) setLang(saved);
    };
    readLang();
    window.addEventListener("languageChanged", readLang);
    return () => window.removeEventListener("languageChanged", readLang);
  }, []);

  const t = translations[lang] || translations.en;

  const handleCopyCleanUrl = () => {
    if (typeof window !== "undefined") {
      const cleanUrl = window.location.origin + window.location.pathname;
      navigator.clipboard?.writeText(cleanUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Only show AboveMapSlot if there is a warning or we are in prompt / denied / idle state
  const isDenied = permission === "denied" || errorReason === "denied";
  const isPrompt =
    permission === "prompt" || (permission === "granted" && tracking === "idle");
  const hasInsecure = isInsecureContext;
  const hasUnsupported = isUnsupported;
  const hasInApp = isInAppBrowser;

  if (tracking === "tracking" || tracking === "locating" || tracking === "paused") {
    return null;
  }

  const anim = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } };

  return (
    <div className="w-full mb-4 space-y-3" id="live-gps-above-slot">
      {/* In-App Browser Warning (FR-P1) */}
      {hasInApp && (
        <motion.div
          {...anim}
          className="glass-l2 rounded-[28px] p-4 sm:p-5 border border-amber-300/80 bg-amber-50/90 text-amber-950 shadow-lg space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-[16px] font-bold">Open in Browser</h4>
              <p className="text-[14px] leading-relaxed text-amber-900">
                {t.liveLocInAppBrowser}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyCleanUrl}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-amber-700 active:scale-98 transition shadow-xs cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? t.liveLocLinkCopied : t.liveLocCopyLink}</span>
          </button>
        </motion.div>
      )}

      {/* Insecure Context Warning (FR-P1) */}
      {hasInsecure && (
        <motion.div
          {...anim}
          role="alert"
          className="glass-l2 rounded-[28px] p-4 sm:p-5 border border-rose-300 bg-rose-50/90 text-rose-950 shadow-lg space-y-3"
        >
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-[16px] font-bold">Secure Connection Required</h4>
              <p className="text-[14px] leading-relaxed text-rose-900">
                {t.liveLocInsecureContext}
              </p>
            </div>
          </div>
          <HelplineRow lang={lang} />
        </motion.div>
      )}

      {/* Unsupported Browser (FR-P1) */}
      {hasUnsupported && !hasInsecure && (
        <motion.div
          {...anim}
          role="alert"
          className="glass-l2 rounded-[28px] p-4 sm:p-5 border border-slate-300 bg-slate-50/90 text-slate-900 shadow-lg space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-[16px] font-bold">GPS Not Supported</h4>
              <p className="text-[14px] leading-relaxed text-slate-700">
                {t.liveLocUnsupported}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onPickPointOnMap}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#007AFF] text-white font-bold text-[14px] hover:bg-[#0062cc] active:scale-98 transition shadow-xs cursor-pointer"
          >
            {t.liveLocPickOnMap}
          </button>
          <HelplineRow lang={lang} />
        </motion.div>
      )}

      {/* Denied State (FR-P5) */}
      {isDenied && (
        <motion.div
          {...anim}
          role="alert"
          className="glass-l2 rounded-[32px] p-5 sm:p-6 border border-rose-300/80 bg-rose-50/95 text-rose-950 shadow-xl space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-200 text-rose-900 shrink-0">
              <AlertTriangle className="w-6 h-6 text-rose-700" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[18px] sm:text-[19px] font-black text-rose-950">
                {t.liveLocPermissionDenied}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {/* Android Instructions */}
            <div className="p-3.5 rounded-2xl bg-white/80 border border-rose-200 text-slate-800 space-y-2">
              <div className="font-bold text-[14px] text-rose-900">
                Android (Chrome)
              </div>
              <ol className="text-[13px] space-y-1.5 list-none text-slate-700">
                <li>{t.liveLocAndroidStep1}</li>
                <li>{t.liveLocAndroidStep2}</li>
                <li>{t.liveLocAndroidStep3}</li>
              </ol>
            </div>

            {/* iOS Instructions */}
            <div className="p-3.5 rounded-2xl bg-white/80 border border-rose-200 text-slate-800 space-y-2">
              <div className="font-bold text-[14px] text-rose-900">
                iPhone (Safari)
              </div>
              <ol className="text-[13px] space-y-1.5 list-none text-slate-700">
                <li>{t.liveLocIosStep1}</li>
                <li>{t.liveLocIosStep2}</li>
              </ol>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={requestPermissionAndStart}
              className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-rose-700 text-white font-bold text-[15px] hover:bg-rose-800 active:scale-98 transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.liveLocTryAgain}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                startFallbackQuery();
                onPickPointOnMap?.();
              }}
              className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-white border border-rose-300 text-rose-900 font-bold text-[15px] hover:bg-rose-100 active:scale-98 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              <span>{t.liveLocPickOnMap}</span>
            </button>
          </div>

          <HelplineRow lang={lang} />
        </motion.div>
      )}

      {/* Consent Card (FR-P3) */}
      {isPrompt && !isDenied && !hasInsecure && !hasUnsupported && (
        <motion.div
          {...anim}
          className="glass-l2 rounded-[32px] sm:rounded-[40px] p-6 sm:p-7 border border-white/70 shadow-2xl space-y-4"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/90 border border-emerald-300 text-emerald-900 text-[12px] font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>{t.liveLocGovConfirmed}</span>
            </div>
            <h2 className="text-[20px] sm:text-[23px] font-black text-slate-950 tracking-tight">
              {t.liveLocConsentTitle}
            </h2>
          </div>

          <StormWarningBanner lang={lang} />

          <p className="text-[14px] sm:text-[15px] text-slate-700 leading-relaxed">
            {t.liveLocConsentBody}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={requestPermissionAndStart}
              className="min-h-[48px] px-6 py-3 rounded-2xl bg-[#007AFF] text-white font-bold text-[16px] hover:bg-[#0062cc] active:scale-98 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              id="btn-show-my-location"
            >
              <Navigation className="w-5 h-5 fill-white" />
              <span>{t.liveLocShowLocation}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                startFallbackQuery();
                onPickPointOnMap?.();
              }}
              className="min-h-[48px] px-5 py-3 rounded-2xl bg-white/80 border border-slate-300/80 text-slate-800 font-bold text-[15px] hover:bg-white active:scale-98 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-slate-600" />
              <span>{t.liveLocPickOnMap}</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// =========================================================================
// BELOW-MAP SLOT
// Shows target card, step list, alternatives, multi-choice, arrival, or errors
// =========================================================================
export function BelowMapSlot({
  onFitRoute,
}: {
  onFitRoute?: () => void;
}) {
  const {
    permission,
    tracking,
    currentFix,
    isManualQuery,
    stopTracking,
    recenter,
  } = useLiveLocation();

  const {
    target,
    pinnedTargetId,
    alternatives,
    guidanceMode,
    routeResult,
    routeProgress,
    straightLine,
    profile,
    setProfile,
    isOnlineRoutingOptedIn,
    optInOnlineRouting,
    turnOffOnlineRouting,
    isBatterySaver,
    toggleBatterySaver,
    keepScreenOn,
    toggleKeepScreenOn,
    isArrived,
    undoArrival,
    pinShelter,
    unpinShelter,
    switchTarget,
    impreciseMultiChoice,
    nearerIneligibleAlert,
    coverage,
    walkAdvisory,
    suggestedTarget,
    isOffline,
    latestAnnouncement,
  } = useLiveNavigation();

  const [lang, setLang] = useState<Language>("en");
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showOptInPrompt, setShowOptInPrompt] = useState(false);
  const [isStepsExpanded, setIsStepsExpanded] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const readLang = () => {
      const saved = localStorage.getItem("ashraysetu_lang") as Language;
      if (saved) setLang(saved);
    };
    readLang();
    window.addEventListener("languageChanged", readLang);
    return () => window.removeEventListener("languageChanged", readLang);
  }, []);

  const t = translations[lang] || translations.en;
  const anim = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 12 } };

  // If stopped or no location active and no manual query, do not render below map
  if (tracking === "idle" && !isManualQuery) {
    return (
      <div className="w-full" lang={lang}>
        {/* Single polite aria-live region (7.3) */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {latestAnnouncement}
        </div>
      </div>
    );
  }

  // 1. Locating State (FR-T9 code 3)
  if (tracking === "locating") {
    return (
      <div className="w-full my-4" lang={lang} id="live-gps-below-slot">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {latestAnnouncement}
        </div>
        <div className="glass-l2 rounded-[32px] p-6 border border-white/70 shadow-xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-3 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
            <h3 className="text-[17px] font-bold text-slate-900">
              {t.liveLocLocating}
            </h3>
          </div>
          <p className="text-[14px] text-slate-600">
            {t.liveLocPickOnMap}
          </p>
          <HelplineRow lang={lang} />
        </div>
      </div>
    );
  }

  // 2. Imprecise Multi-Choice State (FR-S3a)
  if (impreciseMultiChoice.isImprecise && impreciseMultiChoice.choices.length > 0) {
    const top3 = impreciseMultiChoice.choices.slice(0, 3);
    const accStr = currentFix ? formatDistanceDisplay(currentFix.accuracyM) : "approximate";

    return (
      <div className="w-full my-4 space-y-4" lang={lang} id="live-gps-below-slot">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {latestAnnouncement}
        </div>
        <div className="glass-l2 rounded-[32px] p-6 border border-amber-300/80 bg-amber-50/80 shadow-xl space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[17px] font-black text-amber-950">
                {fmt(t.liveLocImpreciseTitle, { accuracy: accStr })}
              </h3>
              <p className="text-[14px] text-amber-900 mt-1">
                {t.liveLocPickOnMap}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {top3.map((cand) => (
              <div
                key={cand.shelter.id}
                className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-[15px] text-slate-950">
                    {cand.shelter.name}
                  </div>
                  <div className="text-[13px] text-slate-600">
                    {cand.shelter.block_name}, {cand.shelter.district} •{" "}
                    <span className="font-semibold text-emerald-800">
                      {formatDistanceDisplay(cand.distanceM)} away
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => pinShelter(cand.shelter.id)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#007AFF] text-white font-bold text-[13px] hover:bg-[#0062cc] active:scale-98 transition shadow-xs cursor-pointer shrink-0"
                >
                  {t.liveLocPin}
                </button>
              </div>
            ))}
          </div>

          <HelplineRow lang={lang} />
        </div>
      </div>
    );
  }

  // 3. Arrival Card (FR-D11)
  if (isArrived && target) {
    return (
      <div className="w-full my-4" lang={lang} id="live-gps-below-slot">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {latestAnnouncement}
        </div>
        <motion.div
          {...anim}
          className="glass-l2 rounded-[32px] sm:rounded-[40px] p-6 sm:p-7 border border-emerald-300 bg-emerald-50/90 shadow-2xl space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500 text-white shrink-0 shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-800">
                {t.liveLocManeuverArrive}
              </span>
              <h2 className="text-[22px] sm:text-[24px] font-black text-emerald-950 leading-tight">
                {target.shelter.name}
              </h2>
            </div>
          </div>

          <p className="text-[15px] sm:text-[16px] font-medium text-emerald-900 leading-relaxed">
            {t.liveLocArrivalTitle}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={undoArrival}
              className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-white border border-emerald-300 text-emerald-950 font-bold text-[14px] hover:bg-emerald-100 active:scale-98 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.liveLocNotThereYet}</span>
            </button>
          </div>

          <HelplineRow lang={lang} />
        </motion.div>
      </div>
    );
  }

  // 4. Out of Coverage / No Eligible Found
  const isOutOfCoverage = coverage.isOutOfCoverage;
  const isBeyondMaxRoutable = coverage.isBeyondMaxRoutable;
  const isNoEligible = !target && !impreciseMultiChoice.isImprecise;

  if (isNoEligible || isOutOfCoverage) {
    return (
      <div className="w-full my-4" lang={lang} id="live-gps-below-slot">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {latestAnnouncement}
        </div>
        <div className="glass-l2 rounded-[32px] p-6 border border-rose-300/80 bg-rose-50/90 shadow-xl space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[18px] font-black text-rose-950">
                {isOutOfCoverage ? t.liveLocOutOfCoverage : t.liveLocNoEligibleFound}
              </h3>
              {isBeyondMaxRoutable && (
                <p className="text-[14px] text-rose-900 mt-1">
                  {t.liveLocBeyondMaxRoutable}
                </p>
              )}
            </div>
          </div>

          {nearerIneligibleAlert && (
            <div className="space-y-2 pt-2">
              <div className="text-[13px] font-bold text-slate-700">
                Nearest listed facilities (status check advised):
              </div>
              <div className="p-3.5 rounded-xl bg-white/90 border border-slate-200 text-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[14px]">{nearerIneligibleAlert.shelter.name}</div>
                  <div className="text-[12px] text-slate-500">
                    {formatDistanceDisplay(nearerIneligibleAlert.distanceKm * 1000)} away •{" "}
                    <span className="font-semibold text-rose-700 uppercase">
                      {nearerIneligibleAlert.reason}
                    </span>
                  </div>
                </div>
                {INCHARGE_PHONES_VERIFIED ? (
                  <a
                    href={`tel:${nearerIneligibleAlert.shelter.incharge_phone}`}
                    className="min-h-[44px] px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[12px] font-bold flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                ) : (
                  <a
                    href="tel:1070"
                    className="min-h-[44px] px-3 py-1.5 rounded-lg bg-sky-700 text-white text-[12px] font-bold flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call 1070</span>
                  </a>
                )}
              </div>
            </div>
          )}

          <HelplineRow lang={lang} />
        </div>
      </div>
    );
  }

  // If no target identified yet, return minimal container
  if (!target) {
    return (
      <div className="w-full" lang={lang}>
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {latestAnnouncement}
        </div>
      </div>
    );
  }

  // 5. Main Target Shelter Card (FR-U4)
  const shelter = target.shelter;
  const isPinned = pinnedTargetId === shelter.id;
  const currentRoute = routeResult;
  const hasRoute = (guidanceMode === "routed" || guidanceMode === "cachedRoute") && currentRoute;
  const isStraightLineMode = guidanceMode === "straightLine";

  // Distance & Time display
  let distanceStr = "";
  let durationStr = "";
  let walkScaledNotice = false;

  if (hasRoute && routeProgress) {
    distanceStr = formatDistanceDisplay(routeProgress.remainingDistanceM);
    durationStr = formatDurationDisplay(routeProgress.remainingDurationS);
    if (profile === "foot") walkScaledNotice = true;
  } else if (straightLine) {
    distanceStr = formatDistanceDisplay(straightLine.distanceM);
    if (profile === "foot" && straightLine.durationS) {
      durationStr = `at least ${formatDurationDisplay(straightLine.durationS)}`;
      walkScaledNotice = true;
    }
  }

  // Distance for Walk Advisory (FR-S10)
  const targetDistanceKm = (straightLine?.distanceM || currentRoute?.distanceM || 0) / 1000;
  const showWalkAdvisory = profile === "foot" && targetDistanceKm > MAX_WALK_ADVISE_KM;

  // Surge warning if distant from modeled zone (5.6)
  const showSurgeModelNote = !target.inSurgeZone;

  // External Map Links (FR-D12)
  const googleMapUrl = generateGoogleMapsUrl(shelter.latitude, shelter.longitude, profile);
  const appleMapUrl = generateAppleMapsUrl(shelter.latitude, shelter.longitude, profile);
  const geoUri = generateGeoUri(shelter.latitude, shelter.longitude, shelter.name);

  // Platform detection for external links
  const isIos =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent || "");
  const isAndroid =
    typeof navigator !== "undefined" &&
    /Android/.test(navigator.userAgent || "");

  const pendingBetterShelter = suggestedTarget?.candidate;

  return (
    <div className="w-full my-4 space-y-4" lang={lang} id="live-gps-below-slot">
      {/* Polite Live Region for screen readers (7.3) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {latestAnnouncement}
      </div>

      {/* Nearer Shelter Switch Card after departure (FR-S6) */}
      {pendingBetterShelter && (
        <motion.div
          {...anim}
          className="glass-l2 rounded-[28px] p-4 sm:p-5 border border-emerald-400 bg-emerald-50/95 text-emerald-950 shadow-xl space-y-3"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[16px] font-bold text-emerald-950">
                {fmt(t.liveLocNearerAvailable, {
                  name: pendingBetterShelter.shelter.name,
                  distance: formatDistanceDisplay(pendingBetterShelter.distanceM),
                  time: formatDurationDisplay(pendingBetterShelter.durationS || 0),
                })}
              </h4>
            </div>
          </div>
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => switchTarget(pendingBetterShelter)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-[14px] hover:bg-emerald-800 active:scale-98 transition shadow-xs cursor-pointer"
            >
              {t.liveLocSwitchTarget}
            </button>
            <button
              type="button"
              onClick={() => {}}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-bold text-[14px] hover:bg-emerald-100 active:scale-98 transition shadow-xs cursor-pointer"
            >
              {fmt(t.liveLocKeepGoing, { current: shelter.name })}
            </button>
          </div>
        </motion.div>
      )}

      {/* Straight-line Mode Warning Banner (FR-D9) */}
      {isStraightLineMode && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-950 flex items-start gap-3 shadow-xs"
        >
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[14px] font-medium leading-relaxed">
            {t.liveLocStraightLineBanner}
          </p>
        </div>
      )}

      {/* Main Target Shelter Card (FR-U4) */}
      <motion.div
        {...anim}
        className="glass-l2 rounded-[32px] sm:rounded-[40px] p-6 sm:p-7 border border-white/70 shadow-2xl space-y-5"
      >
        {/* 1. Storm Warning (5.5) */}
        <StormWarningBanner lang={lang} />

        {/* 2. Header Info */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[12px] font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>{t.liveLocGovConfirmed}</span>
            </span>

            {isPinned && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold">
                Pinned
              </span>
            )}

            {target.inSurgeZone && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 border border-sky-300 text-sky-900 text-[11px] font-bold">
                Storm-Surge Model Zone
              </span>
            )}

            {target.isStandby && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold">
                Standby
              </span>
            )}
          </div>

          <h2 className="text-[22px] sm:text-[26px] font-black text-slate-950 leading-tight">
            {shelter.name}
          </h2>

          <div className="text-[14px] text-slate-600 font-medium">
            {shelter.block_name}
            {shelter.gram_panchayat ? `, GP: ${shelter.gram_panchayat}` : ""} •{" "}
            {shelter.district}
          </div>

          <p className="text-[13px] text-slate-500 font-medium">
            {fmt(t.liveLocNearestOfCount, { count: "25" })}
          </p>
        </div>

        {/* 3. Space & Provenance (FR-S1a) */}
        <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 space-y-1">
          <div className="text-[14px] font-bold text-slate-900">
            {target.provenance.displayText}
          </div>
          {!OCCUPANCY_IS_LIVE && (
            <div className="text-[12px] text-amber-800 font-medium">
              {t.liveLocFreeSpaceDisclaimer}
            </div>
          )}
          {target.inSurgeZone && (
            <div className="text-[12px] text-sky-800 font-medium pt-0.5">
              {t.liveLocSurgeNotice}
            </div>
          )}
          {target.isStandby && (
            <div className="text-[12px] text-amber-800 font-medium pt-0.5">
              {t.liveLocStandbyNotice}
            </div>
          )}
        </div>

        {/* 4. Distance & Time Display */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-md">
          <div>
            <div className="text-[12px] uppercase font-bold text-slate-400">
              {t.distance}
            </div>
            <div className="text-[22px] sm:text-[24px] font-black tracking-tight">
              {distanceStr}
            </div>
          </div>
          {durationStr && (
            <div className="text-right">
              <div className="text-[12px] uppercase font-bold text-slate-400">
                Estimated Time
              </div>
              <div className="text-[22px] sm:text-[24px] font-black tracking-tight text-[#007AFF]">
                {durationStr}
              </div>
            </div>
          )}
        </div>

        {walkScaledNotice && (
          <p className="text-[12px] text-slate-600 font-medium italic">
            {t.liveLocAllowExtraTime}
          </p>
        )}

        {/* 5. Walk/Drive Toggle (FR-D5) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProfile("foot")}
            aria-pressed={profile === "foot"}
            className={cn(
              "flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer",
              profile === "foot"
                ? "bg-[#007AFF] text-white shadow-md"
                : "bg-white/80 border border-slate-300 text-slate-700 hover:bg-white"
            )}
          >
            <Footprints className="w-4 h-4" />
            <span>{t.liveLocModeWalk}</span>
          </button>
          <button
            type="button"
            onClick={() => setProfile("car")}
            aria-pressed={profile === "car"}
            className={cn(
              "flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer",
              profile === "car"
                ? "bg-[#007AFF] text-white shadow-md"
                : "bg-white/80 border border-slate-300 text-slate-700 hover:bg-white"
            )}
          >
            <Car className="w-4 h-4" />
            <span>{t.liveLocModeDrive}</span>
          </button>
        </div>

        {/* 6. Action Buttons Stack */}
        <div className="space-y-2.5 pt-1">
          {/* Road Directions or Show Whole Route */}
          {hasRoute ? (
            <button
              type="button"
              onClick={onFitRoute}
              className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-[#007AFF] text-white font-bold text-[15px] hover:bg-[#0062cc] active:scale-98 transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Navigation className="w-5 h-5 fill-white" />
              <span>{t.liveLocShowWholeRoute}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (isOnlineRoutingOptedIn) {
                  // already opted in
                } else {
                  setShowOptInPrompt(true);
                }
              }}
              className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-[#007AFF] text-white font-bold text-[15px] hover:bg-[#0062cc] active:scale-98 transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Navigation className="w-5 h-5 fill-white" />
              <span>{t.liveLocGetRoadDirections}</span>
            </button>
          )}

          {/* External Deep Links (FR-D12) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {isIos && (
              <a
                href={appleMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-300 text-slate-900 font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-white transition active:scale-98 shadow-xs"
              >
                <ExternalLink className="w-4 h-4 text-slate-600" />
                <span>Open in Apple Maps</span>
              </a>
            )}
            <a
              href={googleMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-300 text-slate-900 font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-white transition active:scale-98 shadow-xs"
            >
              <ExternalLink className="w-4 h-4 text-slate-600" />
              <span>Open in Google Maps</span>
            </a>
            {isAndroid && (
              <a
                href={geoUri}
                className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-300 text-slate-900 font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-white transition active:scale-98 shadow-xs"
              >
                <MapPin className="w-4 h-4 text-slate-600" />
                <span>Open Navigation App</span>
              </a>
            )}
          </div>

          {/* Call In-Charge (only if verified) */}
          {INCHARGE_PHONES_VERIFIED && (
            <a
              href={`tel:${shelter.incharge_phone}`}
              className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-emerald-700 transition active:scale-98 shadow-md"
            >
              <PhoneCall className="w-5 h-5" />
              <span>Call In-Charge: {shelter.incharge_name}</span>
            </a>
          )}

          {/* Pin & Stop Row */}
          <div className="flex gap-2">
            {isPinned ? (
              <button
                type="button"
                onClick={unpinShelter}
                className="flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[14px] hover:bg-amber-200 transition active:scale-98 cursor-pointer"
              >
                {t.liveLocUnpin}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => pinShelter(shelter.id)}
                className="flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl bg-white/80 border border-slate-300 text-slate-800 font-bold text-[14px] hover:bg-white transition active:scale-98 cursor-pointer"
              >
                {t.liveLocPin}
              </button>
            )}

            <button
              type="button"
              onClick={stopTracking}
              className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[14px] hover:bg-rose-100 transition active:scale-98 cursor-pointer"
            >
              {t.liveLocStop}
            </button>
          </div>

          {/* Helplines always available (5.5) */}
          <HelplineRow lang={lang} />
        </div>

        {/* 7. Battery Saver & Screen Wake Lock Row */}
        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <button
            type="button"
            onClick={toggleBatterySaver}
            aria-pressed={isBatterySaver}
            className={cn(
              "min-h-[44px] px-3.5 py-1.5 rounded-xl border flex items-center gap-2 transition cursor-pointer font-bold",
              isBatterySaver
                ? "bg-amber-100 border-amber-300 text-amber-900"
                : "bg-white/80 border-slate-200 text-slate-700 hover:bg-white"
            )}
          >
            <Battery className="w-4 h-4 text-amber-700" />
            <span>Battery Saver: {isBatterySaver ? "On" : "Off"}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleKeepScreenOn()}
            aria-pressed={keepScreenOn}
            className={cn(
              "min-h-[44px] px-3.5 py-1.5 rounded-xl border flex items-center gap-2 transition cursor-pointer font-bold",
              keepScreenOn
                ? "bg-sky-100 border-sky-300 text-sky-900"
                : "bg-white/80 border-slate-200 text-slate-700 hover:bg-white"
            )}
            title={t.liveLocKeepScreenOnHelper}
          >
            <Eye className="w-4 h-4 text-sky-700" />
            <span>Keep Screen On: {keepScreenOn ? "On" : "Off"}</span>
          </button>
        </div>

        {/* 8. Online Routing Chip & Privacy Link (5.2, 5.7) */}
        <div className="pt-2 flex items-center justify-between text-[12px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>Road Directions:</span>
            {isOnlineRoutingOptedIn ? (
              <button
                type="button"
                onClick={turnOffOnlineRouting}
                className="font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                On • Turn off
              </button>
            ) : (
              <span className="font-semibold text-slate-600">Off (Offline Guide)</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="text-[#007AFF] font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t.liveLocPrivacy}</span>
          </button>
        </div>
      </motion.div>

      {/* Walk Advisory Card (FR-S10) */}
      {showWalkAdvisory && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-950 flex items-start gap-3 shadow-md"
        >
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[14px] font-bold leading-relaxed">
            {fmt(t.liveLocWalkAdvisory, {
              distance: formatDistanceDisplay(targetDistanceKm * 1000),
            })}
          </p>
        </div>
      )}

      {/* Turn-by-Turn Steps List (FR-D6) */}
      {hasRoute && currentRoute?.steps && currentRoute.steps.length > 0 && (
        <div className="glass-l2 rounded-[32px] p-5 sm:p-6 border border-white/70 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] sm:text-[17px] font-bold text-slate-900 flex items-center gap-2">
              <Navigation2 className="w-5 h-5 text-[#007AFF]" />
              <span>{t.liveLocStepsTitle}</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsStepsExpanded(!isStepsExpanded)}
              className="text-[13px] font-bold text-[#007AFF] hover:underline cursor-pointer"
            >
              {isStepsExpanded ? "Hide Steps" : "Show Steps"}
            </button>
          </div>

          {isStepsExpanded && (
            <ol className="max-h-72 overflow-y-auto divide-y divide-slate-200/60 pr-1 space-y-1">
              {currentRoute.steps.map((step: Step, idx: number) => {
                // Determine arrow angle
                let rotationDeg = 0;
                if (step.maneuver === "turn-left") rotationDeg = -90;
                else if (step.maneuver === "turn-right") rotationDeg = 90;
                else if (step.maneuver === "slight-left") rotationDeg = -45;
                else if (step.maneuver === "slight-right") rotationDeg = 45;
                else if (step.maneuver === "sharp-left") rotationDeg = -135;
                else if (step.maneuver === "sharp-right") rotationDeg = 135;
                else if (step.maneuver === "uturn") rotationDeg = 180;

                return (
                  <li
                    key={idx}
                    className="py-2.5 flex items-start gap-3 text-[14px] text-slate-800"
                  >
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                      <Navigation2
                        className="w-5 h-5 text-[#007AFF]"
                        style={{ transform: `rotate(${rotationDeg}deg)` }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">
                        {step.maneuver === "depart"
                          ? t.liveLocManeuverDepart
                          : step.maneuver === "arrive"
                          ? t.liveLocManeuverArrive
                          : step.maneuver === "turn-left"
                          ? t.liveLocManeuverTurnLeft
                          : step.maneuver === "turn-right"
                          ? t.liveLocManeuverTurnRight
                          : step.maneuver === "slight-left"
                          ? t.liveLocManeuverSlightLeft
                          : step.maneuver === "slight-right"
                          ? t.liveLocManeuverSlightRight
                          : step.maneuver === "sharp-left"
                          ? t.liveLocManeuverSharpLeft
                          : step.maneuver === "sharp-right"
                          ? t.liveLocManeuverSharpRight
                          : step.maneuver === "uturn"
                          ? t.liveLocManeuverUturn
                          : step.maneuver === "keep-left"
                          ? t.liveLocManeuverKeepLeft
                          : step.maneuver === "keep-right"
                          ? t.liveLocManeuverKeepRight
                          : step.maneuver}
                        {step.name ? ` onto ${step.name}` : ""}
                      </div>
                      <div className="text-[12px] text-slate-500 font-medium">
                        {formatDistanceDisplay(step.distanceM)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-200/50">
            © OpenStreetMap contributors · AshraySetu Route Engine
          </div>
        </div>
      )}

      {/* Alternatives List (FR-S8) */}
      {alternatives && alternatives.length > 0 && (
        <div className="glass-l2 rounded-[32px] p-5 sm:p-6 border border-white/70 shadow-xl space-y-3">
          <h3 className="text-[16px] sm:text-[17px] font-bold text-slate-900">
            {t.liveLocAlternativesTitle}
          </h3>
          <div className="space-y-2.5">
            {alternatives.map((alt) => (
              <div
                key={alt.shelter.id}
                className="p-3.5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-[14px] text-slate-950">
                    {alt.shelter.name}
                  </div>
                  <div className="text-[12px] text-slate-500">
                    {alt.shelter.block_name}, {alt.shelter.district} •{" "}
                    <span className="font-semibold text-emerald-800">
                      {formatDistanceDisplay(alt.distanceM)} away
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {alt.provenance.displayText}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => pinShelter(alt.shelter.id)}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-[12px] font-bold hover:bg-slate-100 active:scale-98 transition shadow-xs cursor-pointer shrink-0"
                >
                  {t.liveLocPin}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimers (5.5, 5.6) */}
      <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/60 text-slate-600 text-[12px] space-y-1.5 leading-relaxed">
        <p>{t.liveLocDisclaimersRoute}</p>
        <p>{t.liveLocDisclaimersOccupancy}</p>
        {showSurgeModelNote && (
          <p className="text-sky-800 font-medium">{t.liveLocSurgeGeneralNotice}</p>
        )}
      </div>

      {/* Online Routing Opt-In Dialog (5.2) */}
      {showOptInPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[10002] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full glass-l2 rounded-[32px] p-6 sm:p-7 border border-white/80 bg-white text-slate-900 shadow-2xl space-y-4">
            <h3 className="text-[19px] font-black text-slate-950">
              {t.liveLocGetRoadDirections}
            </h3>
            <p className="text-[14px] text-slate-700 leading-relaxed">
              {t.liveLocPrivacyDisclosure}
            </p>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  optInOnlineRouting();
                  setShowOptInPrompt(false);
                }}
                className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-[#007AFF] text-white font-bold text-[15px] hover:bg-[#0062cc] active:scale-98 transition shadow-md cursor-pointer"
              >
                {t.liveLocContinue}
              </button>
              <button
                type="button"
                onClick={() => setShowOptInPrompt(false)}
                className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-800 font-bold text-[15px] hover:bg-slate-200 active:scale-98 transition cursor-pointer"
              >
                {t.liveLocUseStraightLine}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice Modal (5.7 DPDP Act 2023) */}
      {showPrivacyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[10002] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="max-w-lg w-full max-h-[85vh] overflow-y-auto glass-l2 rounded-[32px] p-6 sm:p-7 border border-white/80 bg-white text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-[19px] font-black text-slate-950 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>AshraySetu Privacy Notice</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-[13px] text-slate-700 space-y-3 leading-relaxed">
              <p>
                <strong>Privacy-First & Device-Local:</strong> AshraySetu is designed
                to operate under cyclone emergency conditions with maximum privacy.
                Your live GPS coordinates remain in device memory and are never saved
                to cookies, storage, or activity logs.
              </p>
              <p>
                <strong>Road Routing Disclosure:</strong> Road directions require an
                explicit opt-in. When enabled, your origin (rounded to ~10 meters) and
                shelter coordinates are processed in server memory for at most 15
                minutes to calculate directions, and are never saved to disk.
              </p>
              <p>
                <strong>DPDP Act 2023 Compliance:</strong> Under Section 6(4) of the
                Digital Personal Data Protection Act, you may withdraw your consent at
                any time with one tap on &quot;Turn off&quot;. Section 7(h) disaster-assistance
                provisions support life-safety shelter discovery.
              </p>
              <p>
                <strong>Data Protection Contact:</strong> For inquiries, contact the
                State Disaster Management Authority at <code>{"{PRIVACY_CONTACT}"}</code>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="w-full min-h-[48px] px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-[14px] hover:bg-slate-800 transition active:scale-98 cursor-pointer"
            >
              Close Notice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Default export wrapper
export default function SafeShelterPanel({
  onPickPointOnMap,
  onFitRoute,
}: {
  onPickPointOnMap?: () => void;
  onFitRoute?: () => void;
}) {
  return (
    <>
      <AboveMapSlot onPickPointOnMap={onPickPointOnMap} />
      <BelowMapSlot onFitRoute={onFitRoute} />
    </>
  );
}
