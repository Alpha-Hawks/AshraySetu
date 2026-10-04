"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Minus,
  AlertCircle,
  QrCode,
  CheckCircle,
  ShieldCheck,
  Baby,
  HeartPulse,
  Accessibility,
  Activity,
  Sparkles,
  Check,
  Building2,
} from "lucide-react";
import { db, initializeDatabase, type Shelter } from "@/lib/db/dexie";
import { translations, type Language } from "@/lib/locales/translations";
import { encodeQRPayload, generateQRCodeDataURL } from "@/lib/qr/codec";
import { syncManager } from "@/lib/sync/syncManager";
import { cn } from "@/lib/utils";
import { IntakePrinterModal, type PrintedPassData } from "@/components/qr/IntakePrinterModal";

function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}

/**
 * Format timestamp as exact hh:mm:ss A (e.g. 04:05:32 PM) in local time zone
 */
function formatClockTime(
  dateVal: number | string | Date | undefined | null,
  targetTimeZone?: string
): string {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "N/A";
    const tz = targetTimeZone || getLocalTimeZone();
    return d.toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateVal);
  }
}

type MorphState = "idle" | "error" | "morphing" | "synthesizing" | "success";

interface PillStepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabledDecrement?: boolean;
  disabledIncrement?: boolean;
  size?: "md" | "lg";
  valueColor?: string;
  ariaLabel?: string;
  className?: string;
}

function PillStepper({
  value,
  onIncrement,
  onDecrement,
  disabledDecrement = false,
  disabledIncrement = false,
  size = "md",
  valueColor = "text-slate-900",
  ariaLabel,
  className,
}: PillStepperProps) {
  const isLg = size === "lg";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-between glass-stepper rounded-full select-none shrink-0",
        isLg ? "h-11 px-1.5 min-w-[130px] gap-2" : "h-9 px-1 min-w-[96px] gap-1",
        className
      )}
    >
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabledDecrement}
        className={cn(
          "rounded-full glass-stepper-btn active:scale-90 disabled:opacity-25 disabled:pointer-events-none text-slate-800 hover:text-slate-950 flex items-center justify-center transition-all shrink-0 cursor-pointer",
          isLg ? "w-8 h-8" : "w-7 h-7"
        )}
        title="Decrease"
      >
        <Minus className={cn("stroke-[2.5]", isLg ? "w-4 h-4" : "w-3.5 h-3.5")} />
      </button>

      <span
        className={cn(
          "font-mono font-black tracking-tight text-center tabular-nums leading-none select-none px-2",
          valueColor,
          isLg ? "text-xl min-w-[2.75rem]" : "text-sm min-w-[1.75rem]"
        )}
        style={{ fontFeatureSettings: '"zero" 1' }}
      >
        {value}
      </span>

      <button
        type="button"
        onClick={onIncrement}
        disabled={disabledIncrement}
        className={cn(
          "rounded-full glass-stepper-btn active:scale-90 disabled:opacity-25 disabled:pointer-events-none text-slate-800 hover:text-slate-950 flex items-center justify-center transition-all shrink-0 cursor-pointer",
          isLg ? "w-8 h-8" : "w-7 h-7"
        )}
        title="Increase"
      >
        <Plus className={cn("stroke-[2.5]", isLg ? "w-4 h-4" : "w-3.5 h-3.5")} />
      </button>
    </div>
  );
}

export default function IntakePage() {
  const [lang, setLang] = useState<Language>("en");
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedState, setSelectedState] = useState<"ALL" | "ODISHA" | "ANDHRA_PRADESH">("ALL");
  const [selectedShelterId, setSelectedShelterId] = useState<string>("");
  const [morphState, setMorphState] = useState<MorphState>("idle");
  const headInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [headName, setHeadName] = useState("");
  const [hamletName, setHamletName] = useState("");
  const [wardNumber, setWardNumber] = useState<number>(1);
  const [totalMembers, setTotalMembers] = useState<number>(4);
  const [maleCount, setMaleCount] = useState<number>(2);
  const [femaleCount, setFemaleCount] = useState<number>(2);
  const [infantCount, setInfantCount] = useState<number>(0);
  const [elderlyCount, setElderlyCount] = useState<number>(0);
  const [livestockCount, setLivestockCount] = useState<number>(0);

  // Triage Fields (Multi-select)
  const [vulnerabilities, setVulnerabilities] = useState<string[]>(["NONE"]);
  const [clinicalNotes, setClinicalNotes] = useState<string>("");

  // UI state
  const [printedPass, setPrintedPass] = useState<PrintedPassData | null>(null);
  const [qrModalData, setQrModalData] = useState<{
    qrUrl: string;
    payloadText: string;
    familySummary: string;
    createdAt: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Regional breakdown lists
  const odishaShelters = shelters.filter(
    (s) => s.state === "ODISHA" || s.id?.startsWith("OD-")
  );
  const apShelters = shelters.filter(
    (s) => s.state === "ANDHRA_PRADESH" || s.id?.startsWith("AP-")
  );

  const filteredShelters =
    selectedState === "ODISHA"
      ? odishaShelters
      : selectedState === "ANDHRA_PRADESH"
      ? apShelters
      : shelters;

  const handleStateChange = (newState: "ALL" | "ODISHA" | "ANDHRA_PRADESH") => {
    setSelectedState(newState);
    if (newState === "ODISHA") {
      const match = odishaShelters.find((s) => s.id === selectedShelterId);
      if (!match && odishaShelters.length > 0) {
        setSelectedShelterId(odishaShelters[0].id);
      }
    } else if (newState === "ANDHRA_PRADESH") {
      const match = apShelters.find((s) => s.id === selectedShelterId);
      if (!match && apShelters.length > 0) {
        setSelectedShelterId(apShelters[0].id);
      }
    }
  };

  useEffect(() => {
    async function init() {
      await initializeDatabase();
      const s = await db.shelters.toArray();
      setShelters(s);
      if (s.length > 0) {
        setSelectedShelterId((prev) => {
          const existing = prev && s.find((item) => item.id === prev);
          const target = existing || s[0];
          if (target.state === "ANDHRA_PRADESH" || target.id?.startsWith("AP-")) {
            setSelectedState("ANDHRA_PRADESH");
          } else if (target.state === "ODISHA" || target.id?.startsWith("OD-")) {
            setSelectedState("ODISHA");
          }
          return target.id;
        });
      }
    }
    init();

    const handleLang = () => {
      const savedLang = localStorage.getItem("ashraysetu_lang") as Language;
      if (savedLang) setLang(savedLang);
    };
    handleLang();
    window.addEventListener("languageChanged", handleLang);
    return () => window.removeEventListener("languageChanged", handleLang);
  }, []);

  const t = translations[lang];

  // Automatically select Unweaned Infant (P2 Urgent) when Infants (Under 5 years) is selected in Demographic Breakdown
  useEffect(() => {
    if (infantCount > 0) {
      setVulnerabilities((prev) => {
        const withoutNone = prev.filter((v) => v !== "NONE");
        if (!withoutNone.includes("INFANT")) {
          return [...withoutNone, "INFANT"];
        }
        return withoutNone;
      });
    } else {
      setVulnerabilities((prev) => {
        const withoutInfant = prev.filter((v) => v !== "INFANT");
        return withoutInfant.length === 0 ? ["NONE"] : withoutInfant;
      });
    }
  }, [infantCount]);

  // Toggle multi-select triage vulnerability options
  const handleToggleVulnerability = (id: string) => {
    if (id === "NONE") {
      setVulnerabilities(["NONE"]);
      return;
    }

    setVulnerabilities((prev) => {
      const withoutNone = prev.filter((v) => v !== "NONE");
      if (withoutNone.includes(id)) {
        const remaining = withoutNone.filter((v) => v !== id);
        return remaining.length === 0 ? ["NONE"] : remaining;
      } else {
        if (id === "INFANT" && infantCount === 0) {
          setInfantCount(1);
        }
        return [...withoutNone, id];
      }
    });
  };

  // Adjust individual demographic groups safely
  const adjustMale = (delta: number) => {
    setMaleCount((prev) => {
      const next = Math.max(0, prev + delta);
      // Ensure at least 1 person exists across all categories
      if (next + femaleCount + infantCount + elderlyCount < 1) return prev;
      return next;
    });
  };

  const adjustFemale = (delta: number) => {
    setFemaleCount((prev) => {
      const next = Math.max(0, prev + delta);
      if (maleCount + next + infantCount + elderlyCount < 1) return prev;
      return next;
    });
  };

  const adjustInfant = (delta: number) => {
    setInfantCount((prev) => {
      const next = Math.max(0, prev + delta);
      if (maleCount + femaleCount + next + elderlyCount < 1) return prev;
      return next;
    });
  };

  const adjustElderly = (delta: number) => {
    setElderlyCount((prev) => {
      const next = Math.max(0, prev + delta);
      if (maleCount + femaleCount + infantCount + next < 1) return prev;
      return next;
    });
  };

  const adjustLivestock = (delta: number) => {
    setLivestockCount((prev) => Math.max(0, prev + delta));
  };

  // Adjust Total Family Members directly: distributes changes across breakdown to stay in sync
  const adjustTotal = (delta: number) => {
    if (delta > 0) {
      // Adding a member: balance between adult females and adult males
      if (maleCount <= femaleCount) {
        setMaleCount((prev) => prev + 1);
      } else {
        setFemaleCount((prev) => prev + 1);
      }
    } else if (delta < 0) {
      const currentSum = maleCount + femaleCount + infantCount + elderlyCount;
      if (currentSum <= 1) return; // Keep at least 1 family member

      // Deduct from largest group first
      if (femaleCount >= maleCount && femaleCount > 0) {
        setFemaleCount((prev) => Math.max(0, prev - 1));
      } else if (maleCount > 0) {
        setMaleCount((prev) => Math.max(0, prev - 1));
      } else if (elderlyCount > 0) {
        setElderlyCount((prev) => Math.max(0, prev - 1));
      } else if (infantCount > 0) {
        setInfantCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  // Automatically keep totalMembers in sync with the sum of all family breakdown members
  useEffect(() => {
    const computedTotal = Math.max(1, maleCount + femaleCount + infantCount + elderlyCount);
    setTotalMembers(computedTotal);
  }, [maleCount, femaleCount, infantCount, elderlyCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headName.trim()) {
      setMorphState("error");
      headInputRef.current?.focus();
      setTimeout(() => {
        setMorphState("idle");
      }, 2500);
      return;
    }

    setIsSubmitting(true);
    setMorphState("morphing");

    if (typeof window !== "undefined") {
      document.body.classList.add("qr-modal-open");
      document.documentElement.setAttribute("data-qr-generating", "true");
      window.dispatchEvent(
        new CustomEvent("qrGeneratingState", { detail: { isGenerating: true } })
      );
    }

    // Phase 2 transition to synthesizing
    const synthTimer = setTimeout(() => {
      setMorphState("synthesizing");
    }, 650);

    const householdId = crypto.randomUUID();
    const shortRef = householdId.substring(0, 4);

    // Map multi-select triage codes
    const activeVulnerabilities = vulnerabilities.filter((v) => v !== "NONE");
    let triageLevel: "P1_CRITICAL" | "P2_URGENT" | "P3_STANDARD" = "P3_STANDARD";
    let triageCode = "P3_STD";

    if (activeVulnerabilities.length > 0) {
      const hasP1 = activeVulnerabilities.some((v) =>
        ["PREGNANT", "BEDRIDDEN", "CHRONIC"].includes(v)
      );
      triageLevel = hasP1 ? "P1_CRITICAL" : "P2_URGENT";

      const codeMap: Record<string, string> = {
        PREGNANT: "P1_PREG",
        INFANT: "P2_INF",
        BEDRIDDEN: "P1_BED",
        DISABLED: "P2_DIS",
        CHRONIC: "P1_CHRONIC",
      };
      triageCode = activeVulnerabilities.map((v) => codeMap[v] || v).join("+");
    }

    // 1. Authoritative Server Timestamp Retrieval (Rule 1: Server time, not only browser clock)
    let authoritativeCreatedAt = Date.now();
    try {
      const tRes = await fetch("/api/time");
      if (tRes.ok) {
        const tData = await tRes.json();
        if (tData.server_time) authoritativeCreatedAt = tData.server_time;
      }
    } catch {
      // offline fallback
    }

    // 2. Authoritative QR Creation Record on Backend
    try {
      const createRes = await fetch("/api/qr/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          short_ref: shortRef,
          head_name: headName.trim(),
          hamlet_name: hamletName.trim() || "Coastal Hamlet",
          shelter_id: selectedShelterId,
          total_members: Number(totalMembers),
          client_timestamp: authoritativeCreatedAt,
        }),
      });
      if (createRes.ok) {
        const createData = await createRes.json();
        if (createData.qr_created_at) authoritativeCreatedAt = createData.qr_created_at;
      }
    } catch {
      // offline fallback
    }

    // Save household to IndexedDB with authoritative timestamps
    const householdRecord = {
      id: householdId,
      shelter_id: selectedShelterId,
      head_name: headName.trim(),
      hamlet_name: hamletName.trim() || "Coastal Hamlet",
      ward_number: Number(wardNumber) || 1,
      total_members: Number(totalMembers),
      male_count: Number(maleCount),
      female_count: Number(femaleCount),
      child_under_five_count: Number(infantCount),
      elderly_above_sixty_count: Number(elderlyCount),
      livestock_count: Number(livestockCount),
      registered_at: authoritativeCreatedAt,
      qr_created_at: authoritativeCreatedAt,
      status: "ISSUED",
      sync_status: "PENDING_SYNC" as const,
    };

    await db.households.add(householdRecord);

    // Save all selected triage vulnerabilities to db.triage
    if (activeVulnerabilities.length > 0) {
      const catMap: Record<string, "PREGNANT" | "INFANT" | "ELDERLY_BEDRIDDEN" | "DISABLED" | "CHRONIC_MED"> = {
        PREGNANT: "PREGNANT",
        INFANT: "INFANT",
        BEDRIDDEN: "ELDERLY_BEDRIDDEN",
        DISABLED: "DISABLED",
        CHRONIC: "CHRONIC_MED",
      };

      for (const vuln of activeVulnerabilities) {
        const isP1 = ["PREGNANT", "BEDRIDDEN", "CHRONIC"].includes(vuln);
        const itemLevel: "P1_CRITICAL" | "P2_URGENT" = isP1 ? "P1_CRITICAL" : "P2_URGENT";
        await db.triage.add({
          id: crypto.randomUUID(),
          household_id: householdId,
          shelter_id: selectedShelterId,
          person_name: `${headName.trim()} (${vuln})`,
          vulnerability_category: catMap[vuln] || "CHRONIC_MED",
          triage_level: itemLevel,
          notes: clinicalNotes.trim(),
          created_at: authoritativeCreatedAt,
        });
      }
    }

    // Update shelter current occupancy in IndexedDB
    const currentShelter = await db.shelters.get(selectedShelterId);
    if (currentShelter) {
      await db.shelters.update(selectedShelterId, {
        current_occupancy: currentShelter.current_occupancy + Number(totalMembers),
      });
    }

    // Queue sync log mutation
    await syncManager.enqueueMutation(
      "households",
      householdId,
      "INSERT",
      householdRecord
    );

    // Generate compact QR Payload with authoritative creation timestamp
    const qrPayload = encodeQRPayload({
      version: "V1",
      shelterId: selectedShelterId,
      shortRef,
      totalMembers,
      maleCount,
      femaleCount,
      infantCount,
      elderlyCount,
      livestockCount,
      triageCode,
      headName,
      hamletName,
      createdAt: authoritativeCreatedAt,
    });

    const [_, qrDataUrl] = await Promise.all([
      new Promise((res) => setTimeout(res, 200)),
      generateQRCodeDataURL(qrPayload),
    ]);

    clearTimeout(synthTimer);
    setMorphState("success");
    await new Promise((res) => setTimeout(res, 180));

    const activeShelterRecord = shelters.find((s) => s.id === selectedShelterId);

    const vulnerabilityLabels =
      activeVulnerabilities.length > 0
        ? activeVulnerabilities
            .map((v) => {
              if (v === "PREGNANT") return "Pregnant (P1)";
              if (v === "INFANT") return "Infant (P2)";
              if (v === "BEDRIDDEN") return "Bedridden (P1)";
              if (v === "DISABLED") return "Disabled (P2)";
              if (v === "CHRONIC") return "Chronic (P1)";
              return v;
            })
            .join(" • ")
        : "Standard Evacuee";

    setPrintedPass({
      passId: `AS-2026-${shortRef.toUpperCase()}`,
      householdId,
      headName: headName.trim(),
      hamletName: hamletName.trim() || `Ward ${wardNumber}`,
      wardNumber: Number(wardNumber) || 1,
      shelterName: activeShelterRecord?.name || "Designated Evacuation Shelter",
      shelterDistrict: activeShelterRecord?.district || "Coastal District",
      totalMembers: Number(totalMembers),
      maleCount: Number(maleCount),
      femaleCount: Number(femaleCount),
      infantCount: Number(infantCount),
      elderlyCount: Number(elderlyCount),
      livestockCount: Number(livestockCount),
      vulnerability: vulnerabilityLabels,
      createdAt: authoritativeCreatedAt,
      qrPayload,
      qrUrl: qrDataUrl,
    });

    setQrModalData({
      qrUrl: qrDataUrl,
      payloadText: qrPayload,
      familySummary: `${headName} • ${totalMembers} Members • ${hamletName || "Ward " + wardNumber}`,
      createdAt: authoritativeCreatedAt,
    });

    try {
      localStorage.setItem("ashraysetu_last_qr_payload", qrPayload);
      localStorage.setItem("ashraysetu_last_qr_url", qrDataUrl);
    } catch { }

    // Reset form inputs
    setHeadName("");
    setHamletName("");
    setClinicalNotes("");
    setVulnerabilities(["NONE"]);
    setMaleCount(2);
    setFemaleCount(2);
    setInfantCount(0);
    setElderlyCount(0);
    setLivestockCount(0);
    setIsSubmitting(false);
    setMorphState("idle");
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 4000);
  };

  const activeShelter = shelters.find((s) => s.id === selectedShelterId);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-28 sm:pb-36">
      {/* Page Title & Shelter Selector - Liquid Glass Panel (Image 1 Refraction 60, Bezel 48px, Blur 5px, Radius 40px) */}
      <div className="p-6 sm:p-7 rounded-[40px] glass-header-panel space-y-5 relative overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl glass-l3 text-[#007AFF] border border-white/60 flex items-center justify-center shadow-xs shrink-0">
              <Users className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                {t.newIntakeTitle}
              </h1>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                Gram Panchayat Disaster Management Committee • Offline Triage & Real-Time Muster Pass Generation
              </p>
            </div>
          </div>

          {/* Region Selector Pills - Fixed Single-Row Alignment */}
          <div className="flex flex-nowrap items-center gap-1.5 p-1.5 rounded-full glass-l1 border border-white/50 shadow-inner self-start xl:self-auto overflow-x-auto max-w-full [scrollbar-width:none] shrink-0">
            {/* Odisha Button */}
            <button
              type="button"
              onClick={() => handleStateChange("ODISHA")}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-250 select-none cursor-pointer border whitespace-nowrap shrink-0",
                selectedState === "ODISHA"
                  ? "glass-pill-tab-odisha-active"
                  : "text-slate-700 hover:text-slate-950 hover:bg-white/40 border-transparent"
              )}
            >
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0",
                  selectedState === "ODISHA" ? "bg-sky-500 animate-pulse shadow-[0_0_8px_#38bdf8]" : "bg-sky-500/70"
                )}
              />
              <div className="text-left">
                <div className="leading-tight flex items-center gap-1.5 font-bold">
                  <span>Odisha</span>
                  <span className="text-[11px] font-medium opacity-90">(ଓଡ଼ିଶା)</span>
                </div>
                <div className="text-[10px] font-mono font-medium opacity-85">
                  {odishaShelters.length} Coastal Shelters
                </div>
              </div>
            </button>

            {/* Andhra Pradesh Button */}
            <button
              type="button"
              onClick={() => handleStateChange("ANDHRA_PRADESH")}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-250 select-none cursor-pointer border whitespace-nowrap shrink-0",
                selectedState === "ANDHRA_PRADESH"
                  ? "glass-pill-tab-ap-active"
                  : "text-slate-700 hover:text-slate-950 hover:bg-white/40 border-transparent"
              )}
            >
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0",
                  selectedState === "ANDHRA_PRADESH" ? "bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]" : "bg-amber-500/70"
                )}
              />
              <div className="text-left">
                <div className="leading-tight flex items-center gap-1.5 font-bold">
                  <span>Andhra Pradesh</span>
                  <span className="text-[11px] font-medium opacity-90">(ఆంధ్రప్రదేశ్)</span>
                </div>
                <div className="text-[10px] font-mono font-medium opacity-85">
                  {apShelters.length} Coastal Shelters
                </div>
              </div>
            </button>

            {/* All Hubs Combined Toggle */}
            <button
              type="button"
              onClick={() => handleStateChange("ALL")}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-250 select-none cursor-pointer border whitespace-nowrap shrink-0",
                selectedState === "ALL"
                  ? "glass-pill-tab-all-active"
                  : "text-slate-700 hover:text-slate-950 hover:bg-white/40 border-transparent"
              )}
              title="View all combined coastal shelters"
            >
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0",
                  selectedState === "ALL"
                    ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"
                    : "bg-slate-400"
                )}
              />
              <div className="text-left">
                <div className="leading-tight flex items-center gap-1.5 font-bold">
                  <span>All Hubs</span>
                  <span className="text-[11px] font-medium opacity-90">(Combined)</span>
                </div>
                <div className="text-[10px] font-mono font-medium opacity-85">
                  {shelters.length} Coastal Shelters
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Operating Shelter Selector Row (Liquid Glass Control) */}
        <div className="pt-4 border-t border-white/40 flex flex-col md:flex-row md:items-center justify-between gap-3.5 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className="w-4 h-4 text-[#007AFF] shrink-0 stroke-[2.2]" />
            <span className="text-xs font-bold text-slate-800">
              Active Evacuation Destination Shelter:
            </span>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-mono font-bold glass-l1 border",
                selectedState === "ANDHRA_PRADESH"
                  ? "bg-amber-500/20 text-amber-900 border-amber-400/60"
                  : selectedState === "ODISHA"
                  ? "bg-sky-500/20 text-sky-900 border-sky-400/60"
                  : "bg-blue-500/20 text-blue-900 border-blue-400/60"
              )}
            >
              {selectedState === "ANDHRA_PRADESH"
                ? "ANDHRA PRADESH REGION"
                : selectedState === "ODISHA"
                ? "ODISHA REGION"
                : "ALL COASTAL REGIONS"}
            </span>
          </div>

          <div className="w-full md:w-[480px]">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 font-semibold mb-1.5">
              <span>
                {filteredShelters.length} Shelters in{" "}
                {selectedState === "ANDHRA_PRADESH"
                  ? "AP"
                  : selectedState === "ODISHA"
                  ? "Odisha"
                  : "Both States"}
              </span>
              <span>
                {activeShelter
                  ? `${activeShelter.current_occupancy}/${activeShelter.capacity_persons} Occupancy`
                  : `ID: ${selectedShelterId || "N/A"}`}
              </span>
            </div>
            <select
              value={selectedShelterId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedShelterId(newId);
                const chosen = shelters.find((s) => s.id === newId);
                if (chosen?.state === "ANDHRA_PRADESH" || chosen?.id.startsWith("AP-")) {
                  setSelectedState("ANDHRA_PRADESH");
                } else if (chosen?.state === "ODISHA" || chosen?.id.startsWith("OD-")) {
                  setSelectedState("ODISHA");
                }
              }}
              className="w-full glass-select rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition shadow-inner cursor-pointer"
            >
              {filteredShelters.map((s) => (
                <option key={s.id} value={s.id} className="bg-white text-slate-900">
                  {s.name} ({s.district ? `${s.district} • ` : ""}{s.block_name} • {s.current_occupancy}/{s.capacity_persons} Occ)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {successToast && (
        <div className="fixed top-20 right-4 z-50 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Household saved in IndexedDB & QR pass created!</span>
        </div>
      )}

      {/* Main Intake Form - Balanced 2-Column Desktop Grid */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Household Identity & Demographics (Span 7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Household Identity Card - Liquid Glass Panel */}
            <div className="p-6 sm:p-7 rounded-[38px] glass-l2 space-y-5 relative">
              <div className="flex items-center justify-between border-b border-white/40 pb-3.5 relative z-10">
                <div className="text-xs font-bold text-[#007AFF] uppercase tracking-wider flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full glass-l3 text-[#007AFF] border border-blue-300/80 flex items-center justify-center text-xs font-bold shadow-xs">1</span>
                  <span className="font-extrabold tracking-wide">Household Identity & Origin</span>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">Head details</span>
              </div>

              <div className="relative z-10">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  {t.headName} <span className="text-red-500">*</span>
                </label>
                <input
                  ref={headInputRef}
                  type="text"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  placeholder={t.headNamePlaceholder}
                  className={`w-full glass-input rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 font-semibold focus:outline-none transition-all duration-300 ${
                    morphState === "error"
                      ? "border-rose-500 ring-2 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse"
                      : "focus:border-[#007AFF]"
                  }`}
                />
              </div>

              <div className="grid grid-cols-3 gap-3.5 relative z-10">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    {t.hamletName}
                  </label>
                  <input
                    type="text"
                    value={hamletName}
                    onChange={(e) => setHamletName(e.target.value)}
                    placeholder={
                      selectedState === "ANDHRA_PRADESH"
                        ? "e.g., Dimili / Bheemili / Rambilli Beach"
                        : selectedState === "ODISHA"
                        ? "e.g., Talachua / Batighar / Kharinasi"
                        : t.hamletNamePlaceholder
                    }
                    className="w-full glass-input rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 font-semibold focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    {t.wardNumber}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    value={wardNumber}
                    onChange={(e) => setWardNumber(parseInt(e.target.value) || 1)}
                    className="w-full glass-input rounded-2xl px-3 py-2.5 text-sm text-slate-900 text-center font-bold focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              </div>
            </div>

            {/* 2. Demographic Headcounts Card - Liquid Glass Panel */}
            <div className="p-6 sm:p-7 rounded-[38px] glass-l2 space-y-5 relative">
              <div className="flex items-center justify-between border-b border-white/40 pb-3.5 relative z-10">
                <div className="text-xs font-bold text-[#007AFF] uppercase tracking-wider flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full glass-l3 text-[#007AFF] border border-blue-300/80 flex items-center justify-center text-xs font-bold shadow-xs">2</span>
                  <span className="font-extrabold tracking-wide">Demographic Breakdown (ଲୋକସଂଖ୍ୟା)</span>
                </div>
                <div className="text-[10px] font-mono text-emerald-800 glass-l1 px-3 py-1 rounded-full border border-emerald-300/60 font-bold flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
                  <span>AUTO-SYNCHRONIZATION</span>
                </div>
              </div>

              {/* Total Members - Auto-synced */}
              <div className="flex items-center justify-between p-4 rounded-2xl glass-l1 border border-white/60 shadow-inner relative z-10">
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2.5">
                    <span>{t.totalMembers}</span>
                    <span className="text-[10px] font-mono glass-l3 text-[#007AFF] px-2.5 py-0.5 rounded-full border border-sky-300/70 font-black">
                      {totalMembers} Total Persons
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1 font-mono font-medium">
                    Formula: {maleCount}M + {femaleCount}F + {infantCount}Inf + {elderlyCount}Eld = {totalMembers}
                  </div>
                </div>
                <PillStepper
                  size="lg"
                  value={totalMembers}
                  onDecrement={() => adjustTotal(-1)}
                  onIncrement={() => adjustTotal(1)}
                  disabledDecrement={totalMembers <= 1}
                  ariaLabel="Total Members"
                />
              </div>

              {/* Gender & Age Breakdown Grids */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-10">
                {/* Adult Males */}
                <div className="p-3.5 rounded-2xl glass-l1 border border-white/50 flex items-center justify-between hover:border-white/80 transition shadow-xs">
                  <div>
                    <span className="text-xs text-slate-900 font-bold block">
                      {t.adultMales}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">18–60 yrs</span>
                  </div>
                  <PillStepper
                    value={maleCount}
                    onDecrement={() => adjustMale(-1)}
                    onIncrement={() => adjustMale(1)}
                    disabledDecrement={maleCount <= 0 || (totalMembers <= 1 && maleCount === 1)}
                    ariaLabel="Adult Males"
                  />
                </div>

                {/* Adult Females */}
                <div className="p-3.5 rounded-2xl glass-l1 border border-white/50 flex items-center justify-between hover:border-white/80 transition shadow-xs">
                  <div>
                    <span className="text-xs text-slate-900 font-bold block">
                      {t.adultFemales}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">18–60 yrs</span>
                  </div>
                  <PillStepper
                    value={femaleCount}
                    onDecrement={() => adjustFemale(-1)}
                    onIncrement={() => adjustFemale(1)}
                    disabledDecrement={femaleCount <= 0 || (totalMembers <= 1 && femaleCount === 1)}
                    ariaLabel="Adult Females"
                  />
                </div>

                {/* Infants Under 5 */}
                <div className="p-3.5 rounded-2xl glass-l1 border border-white/50 flex items-center justify-between hover:border-white/80 transition shadow-xs">
                  <div>
                    <span className="text-xs text-amber-800 font-bold flex items-center gap-1.5">
                      <Baby className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
                      <span>{t.infants}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Under 5 yrs</span>
                  </div>
                  <PillStepper
                    value={infantCount}
                    onDecrement={() => adjustInfant(-1)}
                    onIncrement={() => adjustInfant(1)}
                    disabledDecrement={infantCount <= 0 || (totalMembers <= 1 && infantCount === 1)}
                    ariaLabel="Infants"
                  />
                </div>

                {/* Elderly Above 60 */}
                <div className="p-3.5 rounded-2xl glass-l1 border border-white/50 flex items-center justify-between hover:border-white/80 transition shadow-xs">
                  <div>
                    <span className="text-xs text-indigo-900 font-bold flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-indigo-500 stroke-[2.5]" />
                      <span>{t.elderly}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Over 60 yrs</span>
                  </div>
                  <PillStepper
                    value={elderlyCount}
                    onDecrement={() => adjustElderly(-1)}
                    onIncrement={() => adjustElderly(1)}
                    disabledDecrement={elderlyCount <= 0 || (totalMembers <= 1 && elderlyCount === 1)}
                    ariaLabel="Elderly"
                  />
                </div>
              </div>

              {/* Livestock Counter */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl glass-l1 border border-white/50 hover:border-white/80 transition shadow-xs relative z-10">
                <div>
                  <div className="text-xs font-bold text-emerald-800">
                    {t.livestock} (Cattle / Goats)
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Mound accommodation (separate from human capacity)
                  </div>
                </div>
                <PillStepper
                  value={livestockCount}
                  onDecrement={() => adjustLivestock(-1)}
                  onIncrement={() => adjustLivestock(1)}
                  disabledDecrement={livestockCount <= 0}
                  ariaLabel="Livestock"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Medical Triage, Live Pass Dossier & Morph Submit (Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            {/* 3. Special Medical Triage Card - Liquid Glass Panel (Multi-select) */}
            <div className="p-6 sm:p-7 rounded-[38px] glass-l2 space-y-5 relative">
              <div className="flex items-center justify-between border-b border-white/40 pb-3.5 relative z-10">
                <div className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full glass-l3 text-rose-600 border border-rose-300/80 flex items-center justify-center text-xs font-bold shadow-xs">3</span>
                  <HeartPulse className="w-4 h-4 stroke-[2.5]" />
                  <span className="font-extrabold tracking-wide">{t.triageSection}</span>
                </div>
                {(() => {
                  const active = vulnerabilities.filter((v) => v !== "NONE");
                  const hasP1 = active.some((v) => ["PREGNANT", "BEDRIDDEN", "CHRONIC"].includes(v));
                  if (active.length > 0) {
                    return (
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-mono font-bold border shadow-xs flex items-center gap-1.5",
                          hasP1
                            ? "bg-rose-500/15 text-rose-700 border-rose-300 animate-pulse"
                            : "bg-amber-500/15 text-amber-700 border-amber-300"
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>
                          {active.length} Flagged ({hasP1 ? "P1 Critical" : "P2 Urgent"})
                        </span>
                      </span>
                    );
                  }
                  return (
                    <span className="text-[10px] text-slate-500 font-semibold px-2.5 py-0.5 rounded-full glass-l1 border border-white/50">
                      Standard Refuge
                    </span>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2.5 relative z-10">
                {[
                  { id: "NONE", label: t.triageNone, icon: ShieldCheck, color: "text-slate-500", priority: "P3" },
                  { id: "PREGNANT", label: t.triagePregnant, icon: Activity, color: "text-rose-500", priority: "P1" },
                  { id: "INFANT", label: t.triageInfant, icon: Baby, color: "text-amber-500", priority: "P2" },
                  { id: "BEDRIDDEN", label: t.triageBedridden, icon: AlertCircle, color: "text-red-500", priority: "P1" },
                  { id: "DISABLED", label: t.triageDisabled, icon: Accessibility, color: "text-purple-500", priority: "P2" },
                  { id: "CHRONIC", label: t.triageChronic, icon: HeartPulse, color: "text-rose-500", priority: "P1" },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = vulnerabilities.filter((v) => v !== "NONE");
                  const isSelected =
                    item.id === "NONE"
                      ? active.length === 0 || vulnerabilities.includes("NONE")
                      : vulnerabilities.includes(item.id);
                  const isP1 = item.priority === "P1";
                  const isP2 = item.priority === "P2";

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleVulnerability(item.id)}
                      className={cn(
                        "p-3 rounded-2xl text-left text-xs font-semibold flex items-center justify-between gap-2 transition-all select-none cursor-pointer border",
                        isSelected
                          ? isP1
                            ? "glass-option-selected-critical"
                            : isP2
                            ? "glass-option-selected-urgent"
                            : "glass-option-selected"
                          : "glass-option"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={cn("w-4 h-4 shrink-0 stroke-[2.2]", item.color)} />
                        <span className="leading-tight text-[11px] font-bold text-slate-900 truncate">
                          {item.label}
                        </span>
                      </div>
                      {isSelected && (
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-white shadow-xs",
                            isP1 ? "bg-rose-500" : isP2 ? "bg-amber-500" : "bg-[#007AFF]"
                          )}
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {vulnerabilities.filter((v) => v !== "NONE").length > 0 && (
                <div className="pt-2 relative z-10">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>{t.clinicalNotes}</span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      Active: {vulnerabilities.filter((v) => v !== "NONE").join(", ")}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder={t.clinicalNotesPlaceholder}
                    className="w-full glass-input rounded-2xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 font-semibold focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </div>

            {/* 4. Live Pass Dossier - Liquid Glass Dossier */}
            <div className="p-5 sm:p-6 rounded-[32px] glass-l1 border-white/60 space-y-3.5 text-xs relative">
              <div className="flex items-center justify-between text-slate-700 relative z-10">
                <span className="font-extrabold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#007AFF] stroke-[2.5]" />
                  <span>Evacuation Pass Summary</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-800 glass-l3 px-2.5 py-0.5 rounded-full font-bold border border-emerald-300/70">
                  OFFLINE READY
                </span>
              </div>

              <div className="space-y-2 text-[11px] relative z-10">
                <div className="flex justify-between py-1.5 border-b border-black/[0.06]">
                  <span className="text-slate-600 font-medium">Destination Shelter:</span>
                  <span className="font-bold text-slate-900 max-w-[200px] truncate text-right">
                    {activeShelter?.name || "Selected Shelter"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-black/[0.06]">
                  <span className="text-slate-600 font-medium">Regional Hub:</span>
                  <span className="font-bold text-slate-900 text-right">
                    {activeShelter?.state === "ANDHRA_PRADESH"
                      ? "Andhra Pradesh (ఆంధ్రప్రదేశ్)"
                      : "Odisha (ଓଡ଼ିଶା)"}{" "}
                    • {activeShelter?.district || "Coastal Sector"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-black/[0.06]">
                  <span className="text-slate-600 font-medium">Family Intake Tally:</span>
                  <span className="font-mono font-black text-slate-900">
                    {totalMembers} Persons ({maleCount}M, {femaleCount}F, {infantCount}Inf, {elderlyCount}Eld)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-black/[0.06]">
                  <span className="text-slate-600 font-medium">Livestock Mound:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {livestockCount > 0 ? `${livestockCount} Cattle/Goats` : "None"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600 font-medium">Medical Triage Priority:</span>
                  {(() => {
                    const active = vulnerabilities.filter((v) => v !== "NONE");
                    const hasP1 = active.some((v) => ["PREGNANT", "BEDRIDDEN", "CHRONIC"].includes(v));
                    return (
                      <span
                        className={cn(
                          "font-bold text-right max-w-[220px] truncate",
                          active.length > 0
                            ? hasP1
                              ? "text-rose-600 font-bold"
                              : "text-amber-600 font-bold"
                            : "text-slate-800"
                        )}
                      >
                        {active.length > 0
                          ? `${hasP1 ? "P1 CRITICAL" : "P2 URGENT"} (${active.join(", ")})`
                          : "Standard Evacuee"}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Submit Button with Creative Morph Animation */}
            <div className="w-full">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                layout
                initial={false}
                animate={
                  morphState === "error"
                    ? {
                      x: [0, -10, 10, -8, 8, -4, 4, 0],
                      transition: { duration: 0.5, ease: "easeInOut" },
                    }
                    : morphState === "idle"
                      ? { width: "100%", borderRadius: "16px", scale: 1 }
                      : { width: "100%", borderRadius: "16px", scale: [1, 0.98, 1.02, 1] }
                }
                whileHover={morphState === "idle" ? { scale: 1.01 } : {}}
                whileTap={morphState === "idle" ? { scale: 0.985 } : {}}
                transition={{
                  layout: { type: "spring", stiffness: 340, damping: 26 },
                  scale: { duration: 0.2 },
                }}
                className={`relative overflow-hidden h-14 w-full font-bold text-sm select-none transition-colors duration-300 flex items-center justify-center shadow-xl ${morphState === "error"
                    ? "bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white border border-rose-400 shadow-rose-600/40"
                    : morphState === "success"
                      ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white border border-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.65)]"
                      : morphState === "morphing" || morphState === "synthesizing"
                        ? "bg-slate-950 text-white border-2 border-sky-400 shadow-[0_0_35px_rgba(56,189,248,0.45)] ring-2 ring-sky-500/30"
                        : "bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:via-blue-500 hover:to-indigo-500 text-white border border-sky-400/30 shadow-sky-600/35 group"
                  }`}
              >
                {/* Idle Ambient Light Sheen */}
                {morphState === "idle" && (
                  <>
                    <motion.div
                      animate={{ x: ["-120%", "220%"] }}
                      transition={{ repeat: Infinity, duration: 3.5, ease: "linear", repeatDelay: 1 }}
                      className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-400/10 via-indigo-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </>
                )}

                {/* Morphing Outer Dashed Orbit Ring */}
                {(morphState === "morphing" || morphState === "synthesizing") && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                    className="absolute inset-0 rounded-2xl border border-dashed border-sky-400/40 pointer-events-none"
                  />
                )}

                {/* Particle Burst for Success State */}
                {morphState === "success" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                      const rad = (angle * Math.PI) / 180;
                      const x = Math.cos(rad) * 48;
                      const y = Math.sin(rad) * 26;
                      return (
                        <motion.span
                          key={i}
                          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                          animate={{ x, y, opacity: 0, scale: 0.2 }}
                          transition={{ duration: 0.55, ease: "easeOut" }}
                          className="absolute w-2 h-2 rounded-full bg-emerald-200 shadow-[0_0_8px_#34d399]"
                        />
                      );
                    })}
                  </div>
                )}

                {/* Content Switcher */}
                <AnimatePresence mode="wait">
                  {morphState === "idle" && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2.5 font-bold tracking-wide"
                    >
                      <div className="p-1 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                        <QrCode className="w-5 h-5 text-white" />
                      </div>
                      <span>{t.submitIntake}</span>
                    </motion.div>
                  )}

                  {morphState === "error" && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2 text-xs font-semibold px-4"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
                      <span>Please Enter Head of Household Name</span>
                    </motion.div>
                  )}

                  {(morphState === "morphing" || morphState === "synthesizing") && (
                    <motion.div
                      key="morphing-scanner"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="flex items-center gap-3 px-3"
                    >
                      {/* Cyber Scanner Disc */}
                      <div className="relative w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/60 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                        <QrCode className="w-4 h-4 text-sky-300" />
                        {/* Sweeping Laser Beam */}
                        <motion.div
                          animate={{ y: [-14, 14, -14] }}
                          transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
                          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_8px_#38bdf8]"
                        />
                      </div>

                      {/* Morph Status Text */}
                      <div className="text-left flex flex-col justify-center">
                        <div className="text-xs font-mono font-bold text-sky-300 tracking-tight flex items-center gap-1.5">
                          {morphState === "morphing" ? (
                            <>
                              <span>Securing Token...</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                            </>
                          ) : (
                            <>
                              <span>Forging QR Pass...</span>
                              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                            </>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {morphState === "morphing" ? "Syncing server timestamp" : "Cryptographic circular pass"}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {morphState === "success" && (
                    <motion.div
                      key="success"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="flex items-center gap-2.5 text-xs font-bold text-white tracking-wide"
                    >
                      <div className="w-7 h-7 rounded-full bg-white/20 border border-white/40 flex items-center justify-center shadow-inner">
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      </div>
                      <span className="text-sm font-extrabold tracking-wide">Pass Generated! ✓</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

            </div>
          </div>
        </div>
      </form>

      {/* Physical Reel-Style QR Token Pass Printer Modal */}
      {printedPass && (
        <IntakePrinterModal
          passData={printedPass}
          onClose={() => {
            setPrintedPass(null);
            setQrModalData(null);
            if (typeof window !== "undefined") {
              document.body.classList.remove("qr-modal-open");
              document.documentElement.removeAttribute("data-qr-generating");
              window.dispatchEvent(
                new CustomEvent("qrGeneratingState", { detail: { isGenerating: false } })
              );
            }
          }}
        />
      )}
    </div>
  );
}
