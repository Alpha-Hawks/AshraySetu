"use client";

import React, { useState, useEffect, useRef } from "react";
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
  RefreshCw,
  Flashlight,
  Volume2,
  X,
  ChevronRight,
  Clock,
  FileText,
  Upload,
  Undo2,
  AlertCircle,
  ArrowUpRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { decodeQRPayload, type QRPayloadData } from "@/lib/qr/codec";
import {
  db,
  initializeDatabase,
  type Shelter,
  type Household,
  type EvacueeTriage,
  type ShelterAdmission,
} from "@/lib/db/dexie";
import { translations, type Language } from "@/lib/locales/translations";

export default function ScanPage() {
  const [lang, setLang] = useState<Language>("en");
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedShelterId, setSelectedShelterId] = useState<string>("");
  const [manualCode, setManualCode] = useState<string>("");
  const [scannedResult, setScannedResult] = useState<QRPayloadData | null>(null);
  const [matchedHousehold, setMatchedHousehold] = useState<Household | null>(null);
  const [matchedTriage, setMatchedTriage] = useState<EvacueeTriage | null>(null);
  const [existingAdmission, setExistingAdmission] = useState<ShelterAdmission | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAdmitted, setIsAdmitted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"scanner" | "muster">("scanner");

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);

  // Admitted Muster Roll state
  const [admissions, setAdmissions] = useState<ShelterAdmission[]>([]);
  const [searchMuster, setSearchMuster] = useState<string>("");

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Initial Data
  const refreshData = async () => {
    await initializeDatabase();
    const s = await db.shelters.toArray();
    setShelters(s);
    if (s.length > 0 && !selectedShelterId) {
      setSelectedShelterId(s[0].id);
    }
  };

  const loadAdmissions = async (shelterId: string) => {
    if (!shelterId) return;
    try {
      const records = await db.admissions
        .where("shelter_id")
        .equals(shelterId)
        .reverse()
        .sortBy("admitted_at");
      setAdmissions(records);
    } catch {
      // In case Dexie version upgrade in progress
      setAdmissions([]);
    }
  };

  useEffect(() => {
    refreshData();

    const handleLang = () => {
      const savedLang = localStorage.getItem("ashraysetu_lang") as Language;
      if (savedLang) setLang(savedLang);
    };
    handleLang();
    window.addEventListener("languageChanged", handleLang);
    return () => window.removeEventListener("languageChanged", handleLang);
  }, []);

  useEffect(() => {
    if (selectedShelterId) {
      loadAdmissions(selectedShelterId);
    }
  }, [selectedShelterId]);

  const t = translations[lang];
  const currentShelter = shelters.find((s) => s.id === selectedShelterId);

  // Sound and Haptic Feedback
  const playScanBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // AudioContext unavailable or blocked
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  // Camera Management
  const startCamera = async (facing: "environment" | "user" = cameraFacingMode) => {
    setCameraError(null);
    setIsCameraLoading(true);

    try {
      // Stop previous instance if running
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }

      const qrScanner = new Html5Qrcode("qr-camera-viewport");
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: facing },
        {
          fps: 15,
          qrbox: (w, h) => {
            const minSide = Math.min(w, h);
            const box = Math.max(220, Math.floor(minSide * 0.72));
            return { width: box, height: box };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          playScanBeep();
          handleProcessCode(decodedText);
        },
        () => {
          // Frame parse error - ignore standard noise
        }
      );

      setIsCameraActive(true);
      setIsCameraLoading(false);

      // Check flashlight/torch capability
      try {
        const capabilities = qrScanner.getRunningTrackCapabilities();
        setHasTorch(Boolean(capabilities && (capabilities as any).torch));
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.error("Camera startup error:", err);
      setIsCameraActive(false);
      setIsCameraLoading(false);

      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.message?.toLowerCase().includes("permission")
      ) {
        setCameraError(
          "Camera permission was denied. Please click the lock/camera icon in your browser address bar to allow camera access."
        );
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setCameraError(
          "No camera hardware detected on this device. You can still scan passes by uploading a pass image or using manual entry below."
        );
      } else {
        setCameraError(
          `Unable to access camera: ${err?.message || "Please check camera permissions."}`
        );
      }
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Error stopping camera", err);
      }
    }
    setIsCameraActive(false);
    setTorchOn(false);
  };

  const switchCamera = async () => {
    const nextFacing = cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(nextFacing);
    if (isCameraActive) {
      await stopCamera();
      await startCamera(nextFacing);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn("Torch toggle error", err);
    }
  };

  // Image File Scanner
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    try {
      const scanner = new Html5Qrcode("qr-hidden-file-sink");
      const result = await scanner.scanFile(file, true);
      playScanBeep();
      handleProcessCode(result);
    } catch (err: any) {
      setErrorMessage("No valid QR code pass detected in the selected image file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          try {
            html5QrCodeRef.current?.clear();
          } catch {}
        });
      }
    };
  }, []);

  // Process & Retrieve Household Intake Details
  const handleProcessCode = async (codeText: string) => {
    setErrorMessage(null);
    setIsAdmitted(false);
    const decoded = decodeQRPayload(codeText.trim());

    if (!decoded) {
      setErrorMessage("Invalid or corrupted QR evacuation token format. Please re-scan.");
      setScannedResult(null);
      setMatchedHousehold(null);
      setMatchedTriage(null);
      setExistingAdmission(null);
      return;
    }

    setScannedResult(decoded);

    // Look up full household intake from Dexie database
    try {
      const allHouseholds = await db.households.toArray();
      const household = allHouseholds.find(
        (h) =>
          h.id.startsWith(decoded.shortRef) ||
          h.head_name.toLowerCase().trim() === (decoded.headName || "").toLowerCase().trim()
      );
      setMatchedHousehold(household || null);

      if (household) {
        const triage = await db.triage.where("household_id").equals(household.id).first();
        setMatchedTriage(triage || null);
      } else {
        // Fallback: check if triage exists for shortRef
        const triage = await db.triage.where("id").equals(`triage-${decoded.shortRef}`).first();
        setMatchedTriage(triage || null);
      }

      // Check if already admitted to this shelter
      const existing = await db.admissions
        .where("shelter_id")
        .equals(selectedShelterId)
        .and((adm) => adm.household_token === decoded.shortRef || adm.head_name === decoded.headName)
        .first();

      setExistingAdmission(existing || null);
      if (existing) {
        setIsAdmitted(true);
      }
    } catch (err) {
      console.error("Dexie lookup error:", err);
    }
  };

  // Confirm Admission & Calculate Entered Headcount
  const handleConfirmAdmission = async () => {
    if (!scannedResult || !currentShelter) return;

    try {
      // 1. Increment Shelter Occupancy in IndexedDB
      const newOccupancy = currentShelter.current_occupancy + scannedResult.totalMembers;
      await db.shelters.update(selectedShelterId, {
        current_occupancy: newOccupancy,
      });

      // 2. Derive triage category
      let triageCategory = "P3_STANDARD";
      if (scannedResult.triageCode.startsWith("P1")) triageCategory = "P1_CRITICAL";
      else if (scannedResult.triageCode.startsWith("P2")) triageCategory = "P2_URGENT";

      // 3. Create permanent admission muster record
      const admissionRecord: ShelterAdmission = {
        id: crypto.randomUUID(),
        shelter_id: selectedShelterId,
        household_token: scannedResult.shortRef,
        head_name: scannedResult.headName || "Unknown Head",
        hamlet_name: scannedResult.hamletName || "Coastal Hamlet",
        ward_number: matchedHousehold?.ward_number || 1,
        total_members: scannedResult.totalMembers,
        male_count: scannedResult.maleCount,
        female_count: scannedResult.femaleCount,
        child_under_five_count: scannedResult.infantCount,
        elderly_above_sixty_count: scannedResult.elderlyCount,
        livestock_count: scannedResult.livestockCount,
        triage_code: scannedResult.triageCode,
        triage_level: matchedTriage?.triage_level || triageCategory,
        admitted_at: Date.now(),
        clinical_notes:
          matchedTriage?.notes ||
          (scannedResult.triageCode.includes("PREG")
            ? "Maternity Care: Third trimester pregnancy triage flagged."
            : scannedResult.triageCode.includes("BED")
            ? "Geriatric/Mobility: Bedridden patient requiring ground floor cot."
            : scannedResult.triageCode.includes("CHRONIC")
            ? "Chronic Medication: Insulin/dialysis maintenance flagged."
            : undefined),
        ration_water_litres: scannedResult.totalMembers * 3.0,
        ration_food_packets: scannedResult.totalMembers * 2,
      };

      await db.admissions.add(admissionRecord);

      // Refresh shelter & admissions state
      await refreshData();
      await loadAdmissions(selectedShelterId);

      setExistingAdmission(admissionRecord);
      setIsAdmitted(true);
      playScanBeep();
    } catch (err) {
      console.error("Admission error:", err);
      alert("Failed to record shelter admission. Please retry.");
    }
  };

  // Revert / Undo Admission (decrements headcount if admitted accidentally)
  const handleUndoAdmission = async (admissionId: string) => {
    if (!confirm("Are you sure you want to revert this admission and deduct the headcount from the shelter muster?")) {
      return;
    }

    try {
      const record = await db.admissions.get(admissionId);
      if (record && currentShelter) {
        const revisedOccupancy = Math.max(0, currentShelter.current_occupancy - record.total_members);
        await db.shelters.update(selectedShelterId, {
          current_occupancy: revisedOccupancy,
        });
        await db.admissions.delete(admissionId);

        await refreshData();
        await loadAdmissions(selectedShelterId);

        if (scannedResult && scannedResult.shortRef === record.household_token) {
          setIsAdmitted(false);
          setExistingAdmission(null);
        }
      }
    } catch (err) {
      console.error("Undo error:", err);
    }
  };

  // Calculate gatekeeper shift totals
  const totalShiftEvacuees = admissions.reduce((sum, a) => sum + a.total_members, 0);
  const totalShiftHouseholds = admissions.length;
  const totalShiftInfants = admissions.reduce((sum, a) => sum + a.child_under_five_count, 0);
  const totalShiftElderly = admissions.reduce((sum, a) => sum + a.elderly_above_sixty_count, 0);
  const totalShiftLivestock = admissions.reduce((sum, a) => sum + a.livestock_count, 0);
  const totalShiftCritical = admissions.filter((a) => a.triage_level === "P1_CRITICAL").length;

  const currentCapacity = currentShelter?.capacity_persons || 600;
  const currentOccupancy = currentShelter?.current_occupancy || 0;
  const occupancyPercent = Math.min(100, Math.round((currentOccupancy / currentCapacity) * 100));
  const remainingSpots = Math.max(0, currentCapacity - currentOccupancy);

  // Filtered muster list
  const filteredAdmissions = admissions.filter(
    (a) =>
      a.head_name.toLowerCase().includes(searchMuster.toLowerCase()) ||
      a.hamlet_name.toLowerCase().includes(searchMuster.toLowerCase()) ||
      a.household_token.toLowerCase().includes(searchMuster.toLowerCase())
  );

  // Sample Passes for 1-Click Verification Testing
  const samplePass1 =
    "V1|OD-KEN-RAJ-001|c4b1|5|2|2|1|0|2|P1_PREG|Pravat Kumar Nayak|Talachua";
  const samplePass2 =
    "V1|OD-KEN-RAJ-001|9e2a|6|2|3|0|1|4|P1_BED|Bishnu Charan Das|Batighar Para";
  const samplePass3 =
    "V1|AP-SHELTER-VSP-001|7f1c|4|1|2|1|0|1|P2_INF|K. Appala Naidu|Bheemili Fishermen Colony";
  const samplePass4 =
    "V1|AP-SHELTER-WGD-010|3d4e|3|1|1|0|1|0|P1_CHRONIC|M. Subba Rao|Perupalem Beach";

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      {/* Hidden File Sink for Image QR Decoding */}
      <div id="qr-hidden-file-sink" className="hidden" />

      {/* Top Banner & Shelter Live Occupancy Calculator */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>{t.scanTitle}</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  GATE MUSTER
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Camera QR Pass Scanner & Live Intake Admission Ledger
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("scanner")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "scanner"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scanner</span>
            </button>
            <button
              onClick={() => setActiveTab("muster")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "muster"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Who Entered ({admissions.length})</span>
            </button>
          </div>
        </div>

        {/* Operating Shelter Selector */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>{t.selectShelter}</span>
              <span className="text-[11px] text-slate-500">
                ({shelters.length} Available in Odisha & Andhra Pradesh)
              </span>
            </label>
            <span className="text-[11px] font-mono font-semibold text-sky-400">
              ID: {selectedShelterId || "N/A"}
            </span>
          </div>
          <select
            value={selectedShelterId}
            onChange={(e) => setSelectedShelterId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
          >
            {shelters.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.state === "ANDHRA_PRADESH" ? "AP" : "OD"}] {s.name} — {s.district} (Occupancy: {s.current_occupancy}/{s.capacity_persons})
              </option>
            ))}
          </select>
        </div>

        {/* Real-time Shelter Capacity & Admission Calculator Bar */}
        {currentShelter && (
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Shelter Capacity Status:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">
                  {currentOccupancy} <span className="text-slate-500 text-xs font-normal">/ {currentCapacity} Persons</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    occupancyPercent >= 90
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : occupancyPercent >= 75
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {occupancyPercent}% FULL
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  occupancyPercent >= 90
                    ? "bg-red-500 shadow-md shadow-red-500/50"
                    : occupancyPercent >= 75
                    ? "bg-amber-500 shadow-md shadow-amber-500/50"
                    : "bg-emerald-500 shadow-md shadow-emerald-500/50"
                }`}
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>
                Remaining Capacity:{" "}
                <strong className="text-emerald-400 font-bold">{remainingSpots} Vacancies</strong>
              </span>
              <span>
                Admitted This Gate Shift:{" "}
                <strong className="text-sky-400 font-bold">+{totalShiftEvacuees} Persons ({totalShiftHouseholds} Families)</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {activeTab === "scanner" ? (
        <>
          {/* CAMERA SCANNER VIEWPORT */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Camera Feed
                </h2>
              </div>

              {isCameraActive && (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    SCANNING LIVE
                  </span>

                  {hasTorch && (
                    <button
                      onClick={toggleTorch}
                      className={`p-1.5 rounded-lg border text-xs transition ${
                        torchOn
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                      title="Toggle Torch/Flashlight"
                    >
                      <Flashlight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={switchCamera}
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition text-xs"
                    title="Switch Front/Rear Camera"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* CAMERA CONTAINER */}
            <div className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl bg-slate-950 border-2 border-slate-800 overflow-hidden flex flex-col items-center justify-center group shadow-2xl">
              {/* HTML5 QR Code Mount Element */}
              <div
                id="qr-camera-viewport"
                className={`w-full h-full ${isCameraActive ? "block" : "hidden"}`}
              />

              {/* OVERLAY HUD WHEN CAMERA IS ACTIVE */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center p-6">
                  {/* Corner Targeting Brackets */}
                  <div className="relative w-56 h-56">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg shadow-sm shadow-emerald-400/50" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg shadow-sm shadow-emerald-400/50" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg shadow-sm shadow-emerald-400/50" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg shadow-sm shadow-emerald-400/50" />

                    {/* Laser Scanning Line Animation */}
                    <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/80 rounded animate-scan-laser" />
                  </div>

                  <div className="mt-3 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[11px] font-medium text-slate-300 backdrop-blur-sm">
                    Align QR Pass Token in Target Square
                  </div>
                </div>
              )}

              {/* PLACEHOLDER WHEN CAMERA IS INACTIVE */}
              {!isCameraActive && (
                <div className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Camera Scanner Ready
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Click below to activate device camera and scan evacuee QR passes in real-time.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => startCamera(cameraFacingMode)}
                      disabled={isCameraLoading}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                    >
                      {isCameraLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Requesting Camera...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>Activate Gate Camera</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700 flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4 text-sky-400" />
                      <span>Upload Pass Photo</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls when Active */}
            {isCameraActive && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 font-bold text-xs transition flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span>Pause Camera</span>
                </button>
                <button
                  onClick={switchCamera}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <span>Flip Camera ({cameraFacingMode === "environment" ? "Back" : "Front"})</span>
                </button>
              </div>
            )}

            {/* Camera Permission / Hardware Alert */}
            {cameraError && (
              <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Camera Notice</div>
                  <div className="text-amber-300/90 leading-relaxed">{cameraError}</div>
                  <div className="pt-1">
                    <button
                      onClick={() => startCamera(cameraFacingMode)}
                      className="text-[11px] underline font-bold hover:text-white"
                    >
                      Retry Camera Activation
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message for Corrupted Pass */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* MANUAL CODE ENTRY / QUICK TEST BUTTONS */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Paste or enter raw pass token (e.g. V1|OD-KEN-RAJ-001|c4b1...)"
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  onClick={() => handleProcessCode(manualCode)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs whitespace-nowrap shadow-md shadow-emerald-600/30"
                >
                  Verify Pass
                </button>
              </div>

              {/* 1-Click Quick Test Pass Tokens */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold flex items-center gap-1 text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Quick Test Passes (OD & AP Coastal Cases):
                  </span>
                  <span>Click to test instantly without camera</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setManualCode(samplePass1);
                      handleProcessCode(samplePass1);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-left border border-slate-700/60 transition group"
                  >
                    <div className="font-bold text-sky-300 text-[11px] group-hover:text-white flex items-center justify-between">
                      <span>Pravat Nayak</span>
                      <span className="text-[10px] text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-500/30">P1 PREG</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Talachua • 5 Members (1 Infant, 2 Cattle)
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setManualCode(samplePass2);
                      handleProcessCode(samplePass2);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-left border border-slate-700/60 transition group"
                  >
                    <div className="font-bold text-amber-300 text-[11px] group-hover:text-white flex items-center justify-between">
                      <span>Bishnu Das</span>
                      <span className="text-[10px] text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-500/30">P1 BED</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Batighar • 6 Members (1 Bedridden, 4 Cattle)
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setManualCode(samplePass3);
                      handleProcessCode(samplePass3);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-left border border-slate-700/60 transition group"
                  >
                    <div className="font-bold text-emerald-300 text-[11px] group-hover:text-white flex items-center justify-between">
                      <span>K. Appala Naidu</span>
                      <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/30">P2 INF</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Bheemili AP • 4 Members (1 Infant)
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setManualCode(samplePass4);
                      handleProcessCode(samplePass4);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-left border border-slate-700/60 transition group"
                  >
                    <div className="font-bold text-purple-300 text-[11px] group-hover:text-white flex items-center justify-between">
                      <span>M. Subba Rao</span>
                      <span className="text-[10px] text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-500/30">P1 CHRONIC</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Perupalem AP • 3 Members (Insulin-dependent)
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COMPREHENSIVE HOUSEHOLD INTAKE DOSSIER CARD */}
          {scannedResult && (
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/60 space-y-5 shadow-2xl relative overflow-hidden">
              {/* Decorative Accent Glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {t.passVerified}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Official Evacuee Intake Dossier & Gate Muster
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-950 text-emerald-400 border border-emerald-500/40">
                    PASS #{scannedResult.shortRef.toUpperCase()}
                  </span>
                  {isAdmitted ? (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      ADMITTED
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                      PENDING GATE ENTRY
                    </span>
                  )}
                </div>
              </div>

              {/* Shelter Destination Match Verification */}
              {scannedResult.shelterId === selectedShelterId ? (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Official Designated Shelter Verified: <strong>{currentShelter?.name}</strong>
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-200">
                    MATCH CONFIRMED
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Originally Designated For Shelter: <strong>{scannedResult.shelterId}</strong>
                  </span>
                  <span className="text-[10px] font-bold bg-amber-900/60 px-2 py-0.5 rounded text-amber-200">
                    DIVERTED EVACUEE
                  </span>
                </div>
              )}

              {/* SECTION 1: HOUSEHOLD IDENTITY & RESIDENTIAL ORIGIN */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>Household Identification & Origin</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Head of Household:</span>
                    <span className="text-sm font-bold text-white">
                      {scannedResult.headName}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Hamlet / Village of Origin:</span>
                    <span className="text-sm font-semibold text-slate-200">
                      {scannedResult.hamletName}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Ward / Panchayat:</span>
                    <span className="text-slate-300 font-medium">
                      Ward {matchedHousehold?.ward_number || 1} • {currentShelter?.gram_panchayat || "Coastal Sector"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Intake Registration Record:</span>
                    <span className="text-slate-300 font-medium">
                      {matchedHousehold?.registered_at
                        ? new Date(matchedHousehold.registered_at).toLocaleString()
                        : "Verified Field Intake Record"}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DEMOGRAPHIC BREAKDOWN (WHO ARE ENTERING) */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Calculated Family Demographic Breakdown</span>
                  </div>
                  <span className="text-xs font-bold text-sky-400 bg-sky-950/80 px-2.5 py-0.5 rounded-full border border-sky-500/30">
                    +{scannedResult.totalMembers} Headcount Entering Shelter
                  </span>
                </div>

                {/* Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Members</div>
                    <div className="text-base font-black text-sky-400 mt-0.5">
                      {scannedResult.totalMembers}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Adult Males</div>
                    <div className="text-base font-bold text-slate-200 mt-0.5">
                      {scannedResult.maleCount}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Adult Females</div>
                    <div className="text-base font-bold text-slate-200 mt-0.5">
                      {scannedResult.femaleCount}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-center gap-1">
                      <Baby className="w-3 h-3 text-pink-400" />
                      <span>Infants &lt;5y</span>
                    </div>
                    <div className={`text-base font-bold mt-0.5 ${scannedResult.infantCount > 0 ? "text-pink-400" : "text-slate-400"}`}>
                      {scannedResult.infantCount}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-center gap-1">
                      <HeartPulse className="w-3 h-3 text-amber-400" />
                      <span>Elderly &gt;60y</span>
                    </div>
                    <div className={`text-base font-bold mt-0.5 ${scannedResult.elderlyCount > 0 ? "text-amber-400" : "text-slate-400"}`}>
                      {scannedResult.elderlyCount}
                    </div>
                  </div>
                </div>

                {/* Livestock Info */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span>Domestic Livestock & Cattle:</span>
                  </span>
                  <span className="font-bold text-emerald-400">
                    {scannedResult.livestockCount > 0
                      ? `${scannedResult.livestockCount} Cattle / Goats (Shelter Pen Required)`
                      : "No Livestock Registered"}
                  </span>
                </div>
              </div>

              {/* SECTION 3: SPECIAL MEDICAL TRIAGE & CLINICAL NOTES */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-red-400" />
                    <span>Special Medical Vulnerability & Triage Assessment</span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                      scannedResult.triageCode.startsWith("P1")
                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : scannedResult.triageCode.startsWith("P2")
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        : "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                    }`}
                  >
                    TRIAGE: {scannedResult.triageCode}
                  </span>
                </div>

                {/* Clinical Notes Box */}
                <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400 text-[11px]">
                    <span className="font-semibold text-slate-300">
                      Intake Clinical Assessment Notes:
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      Logged by Medical Intake Officer
                    </span>
                  </div>

                  <p className="text-slate-200 leading-relaxed font-medium">
                    {matchedTriage?.notes ||
                      (scannedResult.triageCode.includes("PREG")
                        ? "High-Risk Pregnancy: Third-trimester expectant mother. Direct to Ground-Floor Wing A (Maternity & Special Care Bay). Provide clean bedroll and notify on-duty ANM nurse."
                        : scannedResult.triageCode.includes("BED")
                        ? "Bedridden / Mobility Impaired: Non-ambulatory senior. Requires stretcher ramp access and quiet corner ground-floor cot with continuous caregiver."
                        : scannedResult.triageCode.includes("CHRONIC")
                        ? "Chronic Medical Dependency: Patient requires cold-pack refrigerated storage for insulin vials and daily blood pressure/sugar check."
                        : scannedResult.triageCode.includes("INF")
                        ? "Infant Care: Infant under 1 year. Disinfect infant formula utensils; allocate private nursing space and oral rehydration salts."
                        : "Standard Refuge: No acute medical emergency reported during intake. Allotted to general communal shelter hall.")}
                  </p>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Recommended Bay:{" "}
                      <strong className="text-emerald-400">
                        {scannedResult.triageCode.startsWith("P1")
                          ? "Ground Floor Maternity / Special Care Wing A"
                          : "General Refugee Dormitory Hall 2"}
                      </strong>
                    </span>
                    <span>
                      Priority Level:{" "}
                      <strong className={scannedResult.triageCode.startsWith("P1") ? "text-red-400" : "text-sky-400"}>
                        {scannedResult.triageCode.startsWith("P1") ? "P1 Immediate" : "Standard Priority"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: IMMEDIATE RELIEF ENTITLEMENT CALCULATOR */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Calculated Gatekeeper Relief Ration Quota</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Drinking Water Quota:</span>
                    <span className="text-sm font-bold text-sky-400">
                      {scannedResult.totalMembers * 3} Litres / Day
                    </span>
                    <span className="text-[10px] text-slate-500 block">3L per person standard</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Dry Food Rations:</span>
                    <span className="text-sm font-bold text-amber-400">
                      {scannedResult.totalMembers * 2} Packets
                    </span>
                    <span className="text-[10px] text-slate-500 block">Chuda, gur & biscuits</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">ORS Sachets & Halogen:</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {scannedResult.totalMembers * 2} Units
                    </span>
                    <span className="text-[10px] text-slate-500 block">Electrolyte & water tabs</span>
                  </div>

                  {scannedResult.infantCount > 0 && (
                    <div className="p-2.5 rounded-lg bg-pink-950/50 border border-pink-500/30">
                      <span className="text-[10px] text-pink-300 block font-medium">Infant Baby Formula:</span>
                      <span className="text-sm font-bold text-pink-200">
                        {scannedResult.infantCount} Tin / Pack
                      </span>
                      <span className="text-[10px] text-pink-400/80 block">For infant &lt;5y</span>
                    </div>
                  )}

                  {scannedResult.femaleCount > 0 && (
                    <div className="p-2.5 rounded-lg bg-purple-950/50 border border-purple-500/30">
                      <span className="text-[10px] text-purple-300 block font-medium">Sanitary & Dignity Kits:</span>
                      <span className="text-sm font-bold text-purple-200">
                        {scannedResult.femaleCount} Kits
                      </span>
                      <span className="text-[10px] text-purple-400/80 block">Adult female evacuees</span>
                    </div>
                  )}

                  {scannedResult.livestockCount > 0 && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-300 block font-medium">Cattle Fodder Tokens:</span>
                      <span className="text-sm font-bold text-emerald-200">
                        {scannedResult.livestockCount} Feed Bundles
                      </span>
                      <span className="text-[10px] text-emerald-400/80 block">Pen & dry straw allocation</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 5: ADMISSION ACTION & OCCUPANCY UPDATE */}
              <div className="pt-2 space-y-3">
                {!isAdmitted ? (
                  <button
                    onClick={handleConfirmAdmission}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition shadow-lg shadow-emerald-600/40 flex items-center justify-center gap-2 group"
                  >
                    <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition" />
                    <span>
                      Confirm Shelter Admission (+{scannedResult.totalMembers} Headcount to Muster)
                    </span>
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/50 space-y-2">
                    <div className="flex items-center justify-between text-emerald-300">
                      <span className="flex items-center gap-2 font-bold text-sm">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        Family Successfully Admitted & Logged in Shelter Muster!
                      </span>
                      <span className="text-xs font-mono text-emerald-400">
                        +{scannedResult.totalMembers} HEADCOUNT
                      </span>
                    </div>
                    <p className="text-xs text-emerald-200/80">
                      Shelter current occupancy updated to{" "}
                      <strong>{currentShelter?.current_occupancy} persons</strong>. Gate muster roll has been recorded offline.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setScannedResult(null);
                      setManualCode("");
                      setMatchedHousehold(null);
                      setMatchedTriage(null);
                      setExistingAdmission(null);
                      setIsAdmitted(false);
                      if (!isCameraActive) {
                        startCamera(cameraFacingMode);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4 text-emerald-400" />
                    <span>Scan Next Evacuee Pass</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("muster")}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition border border-slate-800 flex items-center justify-center gap-1.5"
                  >
                    <span>View Who Entered</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* MUSTER ROLL VIEW: WHO ENTERED THE SHELTER */
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>Shelter Gate Muster Roll</span>
              </h2>
              <p className="text-xs text-slate-400">
                Live list of evacuees and families admitted into {currentShelter?.name}
              </p>
            </div>

            <button
              onClick={() => setActiveTab("scanner")}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Back to Scanner</span>
            </button>
          </div>

          {/* Admission Summary Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Entered</span>
              <div className="text-lg font-black text-sky-400 mt-0.5">
                {totalShiftEvacuees} Persons
              </div>
              <span className="text-[10px] text-slate-500">{totalShiftHouseholds} Households</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Infants Entered</span>
              <div className="text-lg font-black text-pink-400 mt-0.5">
                {totalShiftInfants} Infants
              </div>
              <span className="text-[10px] text-slate-500">Under 5 years</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Elderly Entered</span>
              <div className="text-lg font-black text-amber-400 mt-0.5">
                {totalShiftElderly} Senior Citizens
              </div>
              <span className="text-[10px] text-slate-500">Over 60 years</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Critical Triage (P1)</span>
              <div className="text-lg font-black text-red-400 mt-0.5">
                {totalShiftCritical} Cases
              </div>
              <span className="text-[10px] text-slate-500">Maternity / Bedridden</span>
            </div>
          </div>

          {/* Search Muster Input */}
          <div>
            <input
              type="text"
              value={searchMuster}
              onChange={(e) => setSearchMuster(e.target.value)}
              placeholder="Search by Head of Household, Hamlet, or Pass Token..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Muster Roster Table */}
          {filteredAdmissions.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-950 text-center space-y-2 border border-slate-800">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs font-semibold text-slate-400">
                {searchMuster ? "No matching admitted evacuees found." : "No admissions recorded for this shelter yet."}
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Scan household QR passes or use sample test passes to log evacuee entries into this shelter.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAdmissions.map((adm) => (
                <div
                  key={adm.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">
                        {adm.head_name}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
                        #{adm.household_token.toUpperCase()}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          adm.triage_level === "P1_CRITICAL"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : adm.triage_level === "P2_URGENT"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                        }`}
                      >
                        {adm.triage_code}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Origin: {adm.hamlet_name} (Ward {adm.ward_number || 1})</span>
                      <span>•</span>
                      <span className="text-sky-300 font-semibold">
                        {adm.total_members} Members ({adm.male_count}M • {adm.female_count}F • {adm.child_under_five_count} Inf • {adm.elderly_above_sixty_count} Eld)
                      </span>
                      {adm.livestock_count > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">
                            {adm.livestock_count} Livestock
                          </span>
                        </>
                      )}
                    </div>

                    {adm.clinical_notes && (
                      <div className="text-[10px] text-slate-400 italic">
                        Notes: {adm.clinical_notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="text-right text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(adm.admitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>

                    <button
                      onClick={() => handleUndoAdmission(adm.id)}
                      className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-500/30 transition text-xs"
                      title="Undo Admission (Deduct Headcount)"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
