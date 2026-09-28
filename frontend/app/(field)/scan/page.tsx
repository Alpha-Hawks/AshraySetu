"use client";

import React, { useState, useEffect } from "react";
import {
  QrCode,
  CheckCircle,
  AlertTriangle,
  Camera,
  ShieldCheck,
  Users,
  Baby,
  Activity,
  HeartPulse,
} from "lucide-react";
import { decodeQRPayload, type QRPayloadData } from "@/lib/qr/codec";
import { db, initializeDatabase, type Shelter } from "@/lib/db/dexie";
import { translations, type Language } from "@/lib/locales/translations";

export default function ScanPage() {
  const [lang, setLang] = useState<Language>("en");
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedShelterId, setSelectedShelterId] = useState<string>("");
  const [manualCode, setManualCode] = useState<string>("");
  const [scannedResult, setScannedResult] = useState<QRPayloadData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAdmitted, setIsAdmitted] = useState<boolean>(false);

  useEffect(() => {
    async function init() {
      await initializeDatabase();
      const s = await db.shelters.toArray();
      setShelters(s);
      if (s.length > 0) setSelectedShelterId(s[0].id);
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

  const handleProcessCode = (codeText: string) => {
    setErrorMessage(null);
    setIsAdmitted(false);
    const decoded = decodeQRPayload(codeText.trim());

    if (!decoded) {
      setErrorMessage("Invalid or corrupted QR token payload format.");
      setScannedResult(null);
      return;
    }

    setScannedResult(decoded);
  };

  const handleConfirmAdmission = async () => {
    if (!scannedResult) return;

    // Check if shelter is active
    const shelter = await db.shelters.get(selectedShelterId);
    if (shelter) {
      await db.shelters.update(selectedShelterId, {
        current_occupancy: shelter.current_occupancy + scannedResult.totalMembers,
      });
    }

    setIsAdmitted(true);
  };

  // Preset demo test strings to verify without camera
  const samplePass1 =
    "V1|OD-KEN-RAJ-001|c4b1|5|2|2|1|0|2|P1_PREG|Pravat Kumar Nayak|Talachua";
  const samplePass2 =
    "V1|OD-KEN-RAJ-001|9e2a|6|2|3|0|1|4|P1_BED|Bishnu Charan Das|Batighar Para";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Scanner Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              {t.scanTitle}
            </h1>
            <p className="text-xs text-slate-400">
              Offline Optical Verification & Shelter Muster
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
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
          >
            {shelters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.current_occupancy}/{s.capacity_persons} Occupied)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Camera Viewport Placeholder / Input Box */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-lg">
        <div className="relative w-64 h-64 mx-auto rounded-2xl bg-slate-950 border-2 border-dashed border-emerald-500/50 flex flex-col items-center justify-center p-4">
          <Camera className="w-12 h-12 text-emerald-400/60 mb-2" />
          <div className="text-xs font-medium text-slate-400">
            {t.scanInstructions}
          </div>
          <div className="absolute inset-x-4 top-1/2 h-0.5 bg-emerald-500/80 shadow-md shadow-emerald-500/50 animate-pulse pointer-events-none" />
        </div>

        {/* Manual Code Paste / Simulation Buttons */}
        <div className="pt-2 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste or enter raw token payload..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button
              onClick={() => handleProcessCode(manualCode)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs whitespace-nowrap"
            >
              Verify Pass
            </button>
          </div>

          {/* Quick Demo QR Test Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <span className="text-slate-500 text-[11px]">Quick Test:</span>
            <button
              onClick={() => {
                setManualCode(samplePass1);
                handleProcessCode(samplePass1);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-mono"
            >
              Test: Pravat (Pregnant P1)
            </button>
            <button
              onClick={() => {
                setManualCode(samplePass2);
                handleProcessCode(samplePass2);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-mono"
            >
              Test: Bishnu (Bedridden P1)
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Scanned Card Details */}
      {scannedResult && (
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/50 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">
                {t.passVerified}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              REF #{scannedResult.shortRef}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Head of Household:</span>
              <span className="font-bold text-white text-sm">
                {scannedResult.headName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Hamlet / Origin:</span>
              <span className="font-semibold text-slate-200">
                {scannedResult.hamletName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Members:</span>
              <span className="font-black text-sky-400 text-sm">
                {scannedResult.totalMembers} Persons
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Demographic Split:</span>
              <span className="text-slate-300">
                {scannedResult.maleCount}M • {scannedResult.femaleCount}F •{" "}
                {scannedResult.infantCount} Infants • {scannedResult.elderlyCount} Elderly
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Livestock:</span>
              <span className="text-emerald-400 font-semibold">
                {scannedResult.livestockCount} Cattle
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-slate-400">Triage Classification:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  scannedResult.triageCode.startsWith("P1")
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                }`}
              >
                {scannedResult.triageCode}
              </span>
            </div>
          </div>

          {/* Action button */}
          {!isAdmitted ? (
            <button
              onClick={handleConfirmAdmission}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Confirm Shelter Admission (+{scannedResult.totalMembers} Headcount)</span>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-bold text-center border border-emerald-500/40">
              ✓ Family Admitted & Local Shelter Headcount Updated!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
