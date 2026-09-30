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
  X,
  Clock,
  Sparkles,
  Check,
} from "lucide-react";
import { db, initializeDatabase, type Shelter } from "@/lib/db/dexie";
import { translations, type Language } from "@/lib/locales/translations";
import { encodeQRPayload, generateQRCodeDataURL } from "@/lib/qr/codec";
import { syncManager } from "@/lib/sync/syncManager";
import { cn } from "@/lib/utils";

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
  valueColor = "text-white",
  ariaLabel,
  className,
}: PillStepperProps) {
  const isLg = size === "lg";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-between bg-black border border-zinc-800 rounded-full select-none shadow-sm shadow-black/50 shrink-0",
        isLg ? "h-11 px-1.5 min-w-[130px] gap-2" : "h-9 px-1 min-w-[96px] gap-1",
        className
      )}
    >
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabledDecrement}
        className={cn(
          "rounded-full bg-[#242429] hover:bg-[#2f3037] active:scale-90 disabled:opacity-25 disabled:pointer-events-none text-zinc-300 hover:text-white flex items-center justify-center transition-all shrink-0",
          isLg ? "w-8 h-8" : "w-7 h-7"
        )}
        title="Decrease"
      >
        <Minus className={cn("stroke-[2.5]", isLg ? "w-4 h-4" : "w-3.5 h-3.5")} />
      </button>

      <span
        className={cn(
          "font-mono font-bold tracking-tight text-center tabular-nums leading-none select-none px-2",
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
          "rounded-full bg-[#242429] hover:bg-[#2f3037] active:scale-90 disabled:opacity-25 disabled:pointer-events-none text-zinc-300 hover:text-white flex items-center justify-center transition-all shrink-0",
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

  // Triage Fields
  const [vulnerability, setVulnerability] = useState<string>("NONE");
  const [clinicalNotes, setClinicalNotes] = useState<string>("");

  // UI state
  const [qrModalData, setQrModalData] = useState<{
    qrUrl: string;
    payloadText: string;
    familySummary: string;
    createdAt: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    async function init() {
      await initializeDatabase();
      const s = await db.shelters.toArray();
      setShelters(s);
      if (s.length > 0) {
        setSelectedShelterId(s[0].id);
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

    // Phase 2 transition to synthesizing
    const synthTimer = setTimeout(() => {
      setMorphState("synthesizing");
    }, 650);

    const householdId = crypto.randomUUID();
    const shortRef = householdId.substring(0, 4);

    // Map triage code
    let triageLevel: "P1_CRITICAL" | "P2_URGENT" | "P3_STANDARD" = "P3_STANDARD";
    let triageCode = "P3_STD";

    if (vulnerability === "PREGNANT") {
      triageLevel = "P1_CRITICAL";
      triageCode = "P1_PREG";
    } else if (vulnerability === "BEDRIDDEN" || vulnerability === "CHRONIC") {
      triageLevel = "P1_CRITICAL";
      triageCode = vulnerability === "BEDRIDDEN" ? "P1_BED" : "P1_CHRONIC";
    } else if (vulnerability === "INFANT" || vulnerability === "DISABLED") {
      triageLevel = "P2_URGENT";
      triageCode = vulnerability === "INFANT" ? "P2_INF" : "P2_DIS";
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

    // Save triage if present
    if (vulnerability !== "NONE") {
      await db.triage.add({
        id: crypto.randomUUID(),
        household_id: householdId,
        shelter_id: selectedShelterId,
        person_name: `${headName.trim()} (Dependent)`,
        vulnerability_category: vulnerability as any,
        triage_level: triageLevel,
        notes: clinicalNotes.trim(),
        created_at: authoritativeCreatedAt,
      });
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
      new Promise((res) => setTimeout(res, 1200)),
      generateQRCodeDataURL(qrPayload),
    ]);

    clearTimeout(synthTimer);
    setMorphState("success");
    await new Promise((res) => setTimeout(res, 550));

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
    setVulnerability("NONE");
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Title & Shelter Selector */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600/20 text-sky-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              {t.newIntakeTitle}
            </h1>
            <p className="text-xs text-slate-400">
              Gram Panchayat Disaster Management Committee • Offline Triage
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            {t.selectShelter}
          </label>
          <select
            value={selectedShelterId}
            onChange={(e) => setSelectedShelterId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
          >
            {shelters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.block_name} • {s.current_occupancy}/{s.capacity_persons})
              </option>
            ))}
          </select>
        </div>
      </div>

      {successToast && (
        <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Household saved locally in IndexedDB & QR pass created!</span>
          </div>
        </div>
      )}

      {/* Main Intake Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-lg"
      >
        {/* Basic Household Identity */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t.headName} <span className="text-red-400">*</span>
            </label>
            <input
              ref={headInputRef}
              type="text"
              value={headName}
              onChange={(e) => setHeadName(e.target.value)}
              placeholder={t.headNamePlaceholder}
              className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all duration-300 ${morphState === "error"
                  ? "border-rose-500 ring-2 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse"
                  : "border-slate-700 focus:border-sky-500"
                }`}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.hamletName}
              </label>
              <input
                type="text"
                value={hamletName}
                onChange={(e) => setHamletName(e.target.value)}
                placeholder={t.hamletNamePlaceholder}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.wardNumber}
              </label>
              <input
                type="number"
                min="1"
                max="25"
                value={wardNumber}
                onChange={(e) => setWardNumber(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white text-center font-bold focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Demographic Headcounts with Large Touch Buttons */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
              Demographic Breakdown (ଲୋକସଂଖ୍ୟା)
            </div>
            <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>AUTO-SYNCHRONIZATION</span>
            </div>
          </div>

          {/* Total Members - Auto-synced */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-sky-500/40 shadow-inner">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{t.totalMembers}</span>
                <span className="text-[10px] font-mono bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30">
                  {totalMembers} Total Persons
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
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
          <div className="grid grid-cols-2 gap-2.5">
            {/* Adult Males */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
              <div>
                <span className="text-xs text-slate-200 font-semibold block">
                  {t.adultMales}
                </span>
                <span className="text-[10px] text-slate-500">18–60 yrs</span>
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
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
              <div>
                <span className="text-xs text-slate-200 font-semibold block">
                  {t.adultFemales}
                </span>
                <span className="text-[10px] text-slate-500">18–60 yrs</span>
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
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
              <div>
                <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                  <Baby className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.infants}</span>
                </span>
                <span className="text-[10px] text-slate-500">Under 5 yrs</span>
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
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
              <div>
                <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t.elderly}</span>
                </span>
                <span className="text-[10px] text-slate-500">Over 60 yrs</span>
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

          {/* Livestock Counter (separate from human members) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition">
            <div>
              <div className="text-xs font-semibold text-emerald-400">
                {t.livestock} (Cattle / Goats)
              </div>
              <div className="text-[10px] text-slate-500">
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

        {/* Special Medical Triage Section */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5" />
              <span>{t.triageSection}</span>
            </div>
            {vulnerability !== "NONE" && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                P1 Critical Flag
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: "NONE", label: t.triageNone, icon: ShieldCheck, color: "text-slate-400" },
              { id: "PREGNANT", label: t.triagePregnant, icon: Activity, color: "text-rose-400" },
              { id: "INFANT", label: t.triageInfant, icon: Baby, color: "text-amber-400" },
              { id: "BEDRIDDEN", label: t.triageBedridden, icon: AlertCircle, color: "text-red-400" },
              { id: "DISABLED", label: t.triageDisabled, icon: Accessibility, color: "text-purple-400" },
              { id: "CHRONIC", label: t.triageChronic, icon: HeartPulse, color: "text-rose-400" },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = vulnerability === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setVulnerability(item.id)}
                  className={`p-3 rounded-xl border text-left text-xs font-medium flex items-center gap-2.5 transition ${isSelected
                      ? "bg-slate-800 border-sky-500 text-white shadow-md ring-1 ring-sky-500"
                      : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40"
                    }`}
                >
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>

          {vulnerability !== "NONE" && (
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.clinicalNotes}
              </label>
              <input
                type="text"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder={t.clinicalNotesPlaceholder}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          )}
        </div>

        {/* Submit Button with Creative Morph Animation */}
        <div className="pt-2 flex justify-center w-full">
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
                  : { width: "310px", borderRadius: "9999px", scale: [1, 0.98, 1.02, 1] }
            }
            whileHover={morphState === "idle" ? { scale: 1.01 } : {}}
            whileTap={morphState === "idle" ? { scale: 0.985 } : {}}
            transition={{
              layout: { type: "spring", stiffness: 340, damping: 26 },
              scale: { duration: 0.2 },
            }}
            className={`relative overflow-hidden h-14 font-bold text-sm select-none transition-colors duration-300 flex items-center justify-center shadow-xl ${morphState === "error"
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
                className="absolute inset-0 rounded-full border border-dashed border-sky-400/40 pointer-events-none"
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
      </form>

      {/* QR Pass Modal */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setQrModalData(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                {t.qrPassTitle}
              </h3>
              <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                {qrModalData.familySummary}
              </p>
              <div className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-sky-500/50 text-xs font-mono shadow-inner">
                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-slate-300 font-medium">
                  QR Created At:{" "}
                  <strong className="text-sky-300 font-black tracking-wide">
                    {formatClockTime(qrModalData.createdAt)}
                  </strong>
                </span>
                <span className="text-[10px] text-sky-400 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-500/30">
                  {getLocalTimeZone()}
                </span>
              </div>
            </div>

            {/* Rendered Circular QR Pass */}
            <div className="relative flex items-center justify-center py-2">
              <div className="relative rounded-full p-1.5 bg-gradient-to-b from-slate-800/80 via-slate-900 to-slate-950 shadow-2xl shadow-sky-950/60">
                <img
                  src={qrModalData.qrUrl}
                  alt="Circular Shelter QR Pass"
                  className="w-60 h-60 mx-auto rounded-full drop-shadow-2xl select-none"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 leading-snug">
              {t.qrInstructions}
            </div>

            <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-slate-400 break-all select-all">
              {qrModalData.payloadText}
            </div>

            <div className="flex gap-2 pt-1">
              <a
                href={qrModalData.qrUrl}
                download={`ShelterPass_${qrModalData.createdAt}.png`}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/30"
              >
                <span>Download Pass</span>
              </a>
              <button
                onClick={() => setQrModalData(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                {t.closePass}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
