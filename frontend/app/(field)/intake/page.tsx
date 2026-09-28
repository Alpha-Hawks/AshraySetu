"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { db, initializeDatabase, type Shelter } from "@/lib/db/dexie";
import { translations, type Language } from "@/lib/locales/translations";
import { encodeQRPayload, generateQRCodeDataURL } from "@/lib/qr/codec";
import { syncManager } from "@/lib/sync/syncManager";

export default function IntakePage() {
  const [lang, setLang] = useState<Language>("en");
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedShelterId, setSelectedShelterId] = useState<string>("");

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

  // Helper to adjust counts safely
  const adjust = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    delta: number,
    min = 0
  ) => {
    setter((prev) => Math.max(min, prev + delta));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headName.trim()) {
      alert("Please provide the head of household name.");
      return;
    }

    setIsSubmitting(true);
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

    // Save household to IndexedDB
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
      registered_at: Date.now(),
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
        created_at: Date.now(),
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

    // Generate compact QR Payload
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
      createdAt: householdRecord.registered_at,
    });

    const qrDataUrl = await generateQRCodeDataURL(qrPayload);

    setQrModalData({
      qrUrl: qrDataUrl,
      payloadText: qrPayload,
      familySummary: `${headName} • ${totalMembers} Members • ${hamletName || "Ward " + wardNumber}`,
    });

    // Reset form inputs
    setHeadName("");
    setHamletName("");
    setClinicalNotes("");
    setVulnerability("NONE");
    setIsSubmitting(false);
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
        className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-lg"
      >
        {/* Basic Household Identity */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t.headName} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={headName}
              onChange={(e) => setHeadName(e.target.value)}
              placeholder={t.headNamePlaceholder}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
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
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
            Demographic Breakdown (ଲୋକସଂଖ୍ୟା)
          </div>

          {/* Total Members */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div>
              <div className="text-sm font-semibold text-white">
                {t.totalMembers}
              </div>
              <div className="text-[11px] text-slate-400">
                Total family units
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjust(setTotalMembers, -1, 1)}
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-white flex items-center justify-center font-bold"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-black text-lg text-sky-400">
                {totalMembers}
              </span>
              <button
                type="button"
                onClick={() => adjust(setTotalMembers, 1, 1)}
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-white flex items-center justify-center font-bold"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Gender & Age Breakdown Grids */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Adult Males */}
            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">
                {t.adultMales}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjust(setMaleCount, -1, 0)}
                  className="w-7 h-7 rounded bg-slate-800 text-xs font-bold"
                >
                  -
                </button>
                <span className="w-6 text-center text-xs font-bold text-white">
                  {maleCount}
                </span>
                <button
                  type="button"
                  onClick={() => adjust(setMaleCount, 1, 0)}
                  className="w-7 h-7 rounded bg-slate-800 text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Adult Females */}
            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">
                {t.adultFemales}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjust(setFemaleCount, -1, 0)}
                  className="w-7 h-7 rounded bg-slate-800 text-xs font-bold"
                >
                  -
                </button>
                <span className="w-6 text-center text-xs font-bold text-white">
                  {femaleCount}
                </span>
                <button
                  type="button"
                  onClick={() => adjust(setFemaleCount, 1, 0)}
                  className="w-7 h-7 rounded bg-slate-800 text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Infants Under 5 */}
            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-amber-300 font-medium">
                {t.infants}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjust(setInfantCount, -1, 0)}
                  className="w-7 h-7 rounded bg-slate-800 text-xs font-bold"
                >
                  -
                </button>
                <span className="w-6 text-center text-xs font-bold text-amber-400">
                  {infantCount}
                </span>
                <button
                  type="button"
                  onClick={() => adjust(setInfantCount, 1, 0)}
                  className="w-7 h-7 rounded bg-slate-800 text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Elderly Above 60 */}
            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-indigo-300 font-medium">
                {t.elderly}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjust(setElderlyCount, -1, 0)}
                  className="w-7 h-7 rounded bg-slate-800 text-xs font-bold"
                >
                  -
                </button>
                <span className="w-6 text-center text-xs font-bold text-indigo-400">
                  {elderlyCount}
                </span>
                <button
                  type="button"
                  onClick={() => adjust(setElderlyCount, 1, 0)}
                  className="w-7 h-7 rounded bg-slate-800 text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Livestock Counter */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
            <div>
              <div className="text-xs font-medium text-emerald-400">
                {t.livestock}
              </div>
              <div className="text-[10px] text-slate-500">
                Mound accommodation
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjust(setLivestockCount, -1, 0)}
                className="w-7 h-7 rounded bg-slate-800 text-xs font-bold"
              >
                -
              </button>
              <span className="w-6 text-center text-xs font-bold text-emerald-400">
                {livestockCount}
              </span>
              <button
                type="button"
                onClick={() => adjust(setLivestockCount, 1, 0)}
                className="w-7 h-7 rounded bg-slate-800 text-xs font-bold"
              >
                +
              </button>
            </div>
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
                  className={`p-3 rounded-xl border text-left text-xs font-medium flex items-center gap-2.5 transition ${
                    isSelected
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

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white font-bold text-sm transition shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2"
          >
            <QrCode className="w-5 h-5" />
            <span>{t.submitIntake}</span>
          </button>
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
            </div>

            {/* Rendered QR Canvas */}
            <div className="p-3 bg-white rounded-xl inline-block shadow-inner mx-auto">
              <img
                src={qrModalData.qrUrl}
                alt="Shelter QR Pass"
                className="w-56 h-56 mx-auto"
              />
            </div>

            <div className="text-[11px] text-slate-400 leading-snug">
              {t.qrInstructions}
            </div>

            <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-slate-400 break-all select-all">
              {qrModalData.payloadText}
            </div>

            <button
              onClick={() => setQrModalData(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              {t.closePass}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
