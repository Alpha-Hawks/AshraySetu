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
  X,
  ChevronRight,
  Clock,
  FileText,
  Upload,
  Undo2,
  AlertCircle,
  Sparkles,
  Lock,
  CheckCircle2,
  Check,
  ShieldAlert,
} from "lucide-react";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
  Html5QrcodeScannerState,
} from "html5-qrcode";
import { decodeQRPayload, type QRPayloadData } from "@/lib/qr/codec";
import {
  detectCircularCodeFromVideo,
  detectCircularCodeFromFile,
} from "@/lib/qr/circularCode";
import {
  db,
  initializeDatabase,
  type Shelter,
  type Household,
  type EvacueeTriage,
  type ShelterAdmission,
} from "@/lib/db/dexie";
import { translations, type Language } from "@/lib/locales/translations";
import { useMacWindow } from "@/lib/window/MacWindowManager";
import { cn } from "@/lib/utils";

/**
/**
 * Resolves the dynamic local system time zone of the user's browser
 */
function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}

/**
 * Returns human-friendly abbreviation for the local time zone (e.g. IST (GMT+5:30))
 */
function getTimeZoneAbbreviation(tz: string, d: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(d);
    const val = parts.find((p) => p.type === "timeZoneName")?.value;
    if (val) {
      if (val === "GMT+5:30" || val === "UTC+5:30") return "IST (GMT+5:30)";
      return val;
    }
  } catch { }
  return tz === "Asia/Kolkata" || tz === "Asia/Calcutta" ? "IST (GMT+5:30)" : tz;
}

/**
 * Format any timestamp or date into the user's detected local time zone
 */
function formatTimestamp(
  dateVal: number | string | Date | undefined | null,
  targetTimeZone?: string,
  includeSeconds = true
): string {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "Invalid Date";
    const tz = targetTimeZone || getLocalTimeZone();
    const tzShort = getTimeZoneAbbreviation(tz, d);

    const formatted = d.toLocaleString("en-IN", {
      timeZone: tz,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...(includeSeconds ? { second: "2-digit" } : {}),
      hour12: true,
    });

    return tzShort ? `${formatted} (${tzShort})` : formatted;
  } catch {
    return String(dateVal);
  }
}

/**
 * Format time only in the user's detected local time zone
 */
function formatTimeOnly(
  dateVal: number | string | Date | undefined | null,
  targetTimeZone?: string
): string {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "Invalid Time";
    const tz = targetTimeZone || getLocalTimeZone();
    const tzShort = getTimeZoneAbbreviation(tz, d);

    const formatted = d.toLocaleTimeString("en-IN", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    return tzShort ? `${formatted} (${tzShort})` : formatted;
  } catch {
    return String(dateVal);
  }
}

/**
 * Format timestamp as exact hh:mm:ss A (e.g. 04:00:00 PM) linked to local time zone
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

/**
 * Format duration in seconds as XX min YY sec (e.g. 07 min 35 sec)
 */
function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || isNaN(totalSeconds) || totalSeconds < 0) return "00 min 00 sec";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) {
    return `${pad(hours)} hr ${pad(minutes)} min ${pad(seconds)} sec`;
  }
  return `${pad(minutes)} min ${pad(seconds)} sec`;
}

export interface ScanAuditRecord {
  short_ref: string;
  qr_created_at: number;
  qr_scanned_at: number;
  arrival_duration_seconds: number;
  status: string;
  duplicate?: boolean;
  scan_count?: number;
}

export default function ScanPage() {
  const { openWindow } = useMacWindow();
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
  const [isDuplicateScan, setIsDuplicateScan] = useState<boolean>(false);
  const [duplicateNotice, setDuplicateNotice] = useState<{
    firstAdmittedAt: number;
    shelterId: string;
    shelterName: string;
    scanCount: number;
    preventedMembers: number;
    preventedWater: number;
    preventedFood: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"scanner" | "muster" | "printer">("scanner");

  // Automatic Shelter Stock Upgrade Notice State
  const [autoUpgradedStockNotice, setAutoUpgradedStockNotice] = useState<{
    shelterId: string;
    shelterName: string;
    addedMembers: number;
    prevOccupancy: number;
    newOccupancy: number;
    capacityPersons: number;
    rationWater: number;
    rationFood: number;
    rationFormula: number;
    rationOrs: number;
    timestamp: number;
  } | null>(null);

  // Authoritative QR Timing & Arrival Audit State
  const [scanAuditRecord, setScanAuditRecord] = useState<ScanAuditRecord | null>(null);

  // Auto-Detected Timezone State (Linked to user's local device/browser timezone)
  const [detectedTimeZone, setDetectedTimeZone] = useState<string>(() => {
    try {
      return getLocalTimeZone();
    } catch {
      return "Asia/Kolkata";
    }
  });
  const [timeZoneShort, setTimeZoneShort] = useState<string>(() => {
    try {
      const tz = getLocalTimeZone();
      return getTimeZoneAbbreviation(tz);
    } catch {
      return "IST (GMT+5:30)";
    }
  });

  // Accurate Scan Time Lock Tracking (Clock & Timer stop when QR is scanned!)
  const [isClockRunning, setIsClockRunning] = useState<boolean>(true);
  const [currentClockDisplay, setCurrentClockDisplay] = useState<string>("");
  const [scannedAtTimestamp, setScannedAtTimestamp] = useState<number | null>(null);

  // Active Running Elapsed Transit Timer (Runs before scan, freezes immediately at scan)
  const [elapsedTimerSeconds, setElapsedTimerSeconds] = useState<number>(0);
  const [sessionStartTime] = useState<number>(() => Date.now());

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>("");
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);

  // Admitted Muster Roll State
  const [admissions, setAdmissions] = useState<ShelterAdmission[]>([]);
  const [searchMuster, setSearchMuster] = useState<string>("");

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Ultra-fast scanner & hardware detector state refs
  const isProcessingScanRef = useRef<boolean>(false);
  const isScanningActiveRef = useRef<boolean>(false);
  const frameCallbackIdRef = useRef<number | null>(null);
  const nativeDetectorRef = useRef<any>(null);
  const lastProcessedCodeRef = useRef<string | null>(null);
  const lastProcessedAtRef = useRef<number>(0);

  // Modern Drag & Drop / Pass Photo Upload State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isScanningImage, setIsScanningImage] = useState<boolean>(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const dragCounterRef = useRef<number>(0);
  const isProcessingUploadRef = useRef<boolean>(false);
  const lastUploadedFileRef = useRef<{
    name: string;
    size: number;
    lastModified: number;
    time: number;
  } | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Auto-Detect System Timezone and Authoritatively Hydrate Frozen Record from Active Session (Rule 3 & 8)
  useEffect(() => {
    try {
      const tz = getLocalTimeZone();
      setDetectedTimeZone(tz);
      setTimeZoneShort(getTimeZoneAbbreviation(tz));
    } catch {
      setDetectedTimeZone("Asia/Kolkata");
      setTimeZoneShort("IST (GMT+5:30)");
    }

    // Clean up any stale localStorage items left by earlier runs so they do not pollute fresh scanner
    try {
      localStorage.removeItem("ashraysetu_last_scan_audit");
      localStorage.removeItem("ashraysetu_last_scanned_result");
      localStorage.removeItem("ashraysetu_last_scanned_ref");
    } catch { }

    // Rule 3 & 8: If page is refreshed after scan, retrieve the authoritative stored record
    // from this active browser session and display the SAME frozen duration.
    async function restoreFromBackendOrStorage() {
      try {
        const lastShortRef = sessionStorage.getItem("ashraysetu_last_scanned_ref");
        const auditStr = sessionStorage.getItem("ashraysetu_last_scan_audit");
        const resultStr = sessionStorage.getItem("ashraysetu_last_scanned_result");

        // If no active scan in this session, stay clean and ready for scanning
        if (!lastShortRef && !auditStr) {
          return;
        }

        let savedAudit: ScanAuditRecord | null = null;
        let savedResult: QRPayloadData | null = null;

        if (auditStr) {
          try {
            savedAudit = JSON.parse(auditStr);
          } catch { }
        }
        if (resultStr) {
          try {
            savedResult = JSON.parse(resultStr);
          } catch { }
        }

        if (lastShortRef) {
          let backendRecord: any = null;
          try {
            const res = await fetch(`/api/qr/status/${encodeURIComponent(lastShortRef)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.found && data.record && data.record.qr_scanned_at) {
                backendRecord = data.record;
              }
            }
          } catch (e) {
            console.warn("Backend status lookup offline or failed, using local session audit", e);
          }

          const record = backendRecord || savedAudit;
          if (record && record.qr_scanned_at) {
            const actualCreated =
              (savedResult?.createdAt && savedResult.createdAt > 0)
                ? Number(savedResult.createdAt)
                : Number(record.qr_created_at) || Number(record.qr_scanned_at);
            const actualScanned = Number(record.qr_scanned_at);
            const durationSec = Number(
              record.arrival_duration_seconds != null
                ? record.arrival_duration_seconds
                : Math.max(
                  0,
                  Math.floor((actualScanned - actualCreated) / 1000)
                )
            );

            const audit: ScanAuditRecord = {
              short_ref: record.short_ref,
              qr_created_at: actualCreated,
              qr_scanned_at: actualScanned,
              arrival_duration_seconds: durationSec,
              status: record.status || "REACHED_SHELTER",
              duplicate: (record.scan_count || 1) > 1,
              scan_count: record.scan_count || 1,
            };

            setScanAuditRecord(audit);
            setScannedAtTimestamp(audit.qr_scanned_at);
            setElapsedTimerSeconds(durationSec);
            setIsClockRunning(false); // Permanently freeze timer on refresh!

            // Restore scannedResult so the dossier and 4 arrival cards render immediately
            const populatedResult: QRPayloadData = savedResult || {
              version: "V1",
              shelterId: record.shelter_id || "OD-KEN-RAJ-001",
              shortRef: record.short_ref,
              totalMembers: record.total_members || 1,
              maleCount: Math.ceil((record.total_members || 1) / 2),
              femaleCount: Math.floor((record.total_members || 1) / 2),
              infantCount: 0,
              elderlyCount: 0,
              livestockCount: 0,
              triageCode: "P3_STD",
              headName: record.head_name || "Evacuee Head",
              hamletName: record.hamlet_name || "Coastal Sector",
              createdAt: actualCreated,
            };
            setScannedResult(populatedResult);

            const frozenString = new Date(audit.qr_scanned_at).toLocaleString("en-IN", {
              timeZone: detectedTimeZone,
              weekday: "short",
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            });
            setCurrentClockDisplay(`${frozenString} (${timeZoneShort})`);

            // Try to match household in Dexie
            try {
              const allHouseholds = await db.households.toArray();
              const matched = allHouseholds.find(
                (h) =>
                  h.id.startsWith(populatedResult.shortRef) ||
                  h.head_name.toLowerCase().trim() ===
                  (populatedResult.headName || "").toLowerCase().trim()
              );
              setMatchedHousehold(matched || null);
            } catch { }
          }
        }
      } catch (err) {
        console.warn("Failed to restore scan record on refresh:", err);
      }
    }

    restoreFromBackendOrStorage();

    // Support URL ?code= or ?token= to immediately auto-process test pass
    try {
      if (typeof window !== "undefined") {
        const search = new URLSearchParams(window.location.search);
        const codeQuery = search.get("code") || search.get("token");
        if (codeQuery && codeQuery.includes("|")) {
          setTimeout(() => {
            handleProcessCode(codeQuery);
          }, 400);
        }
      }
    } catch { }
  }, [detectedTimeZone, timeZoneShort]);

  // Synchronize Live Gate Clock & Running Elapsed Arrival Timer
  // (Runs before scan; stops & freezes immediately when QR pass is scanned!)
  useEffect(() => {
    if (!isClockRunning) return; // Frozen! Do not run after scan!

    // Check if an evacuee pass was recently created in this browser session
    let transitStart = sessionStartTime;
    try {
      const lastPayload = localStorage.getItem("ashraysetu_last_qr_payload");
      if (lastPayload && lastPayload.includes("|")) {
        const parts = lastPayload.split("|");
        const ts = parts[12] ? parseInt(parts[12], 10) : NaN;
        if (!isNaN(ts) && ts > 0 && ts <= Date.now()) {
          transitStart = ts;
        }
      }
    } catch { }

    const updateClockAndTimer = () => {
      const now = new Date();
      const formatted = now.toLocaleString("en-IN", {
        timeZone: detectedTimeZone,
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setCurrentClockDisplay(`${formatted} (${timeZoneShort})`);

      // Update elapsed duration ticking before scan
      const elapsed = Math.max(0, Math.floor((now.getTime() - transitStart) / 1000));
      setElapsedTimerSeconds(elapsed);
    };

    updateClockAndTimer();
    const timer = setInterval(updateClockAndTimer, 1000);
    return () => clearInterval(timer);
  }, [isClockRunning, detectedTimeZone, timeZoneShort, sessionStartTime]);

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
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // AudioContext unavailable
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  // Warning Sound & Haptic Vibration for Duplicate Scans
  const playWarningBeep = () => {
    try {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(340, ctx.currentTime);
      osc.frequency.setValueAtTime(220, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext unavailable
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([250, 100, 250]);
    }
  };

  // Stop Continuous Frame Scanning Loop
  const stopContinuousScan = () => {
    isScanningActiveRef.current = false;
    if (frameCallbackIdRef.current !== null) {
      const videoEl = document.querySelector<HTMLVideoElement>(
        "#qr-camera-viewport video"
      );
      if (videoEl && "cancelVideoFrameCallback" in videoEl) {
        try {
          (videoEl as any).cancelVideoFrameCallback(frameCallbackIdRef.current);
        } catch { }
      } else {
        cancelAnimationFrame(frameCallbackIdRef.current);
      }
      frameCallbackIdRef.current = null;
    }
  };

  // Ultra-Fast Continuous Camera-Frame Processing (Hardware BarcodeDetector + Offscreen jsQR)
  const startContinuousScan = () => {
    stopContinuousScan();
    isScanningActiveRef.current = true;

    const videoEl = document.querySelector<HTMLVideoElement>(
      "#qr-camera-viewport video"
    );
    if (!videoEl) return;

    // Initialize native hardware BarcodeDetector if available in browser
    if (
      typeof window !== "undefined" &&
      "BarcodeDetector" in window &&
      !nativeDetectorRef.current
    ) {
      try {
        nativeDetectorRef.current = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        });
      } catch {
        nativeDetectorRef.current = null;
      }
    }

    const detector = nativeDetectorRef.current;
    let isScanningThisFrame = false;

    const onFrame = async () => {
      if (!isScanningActiveRef.current || isProcessingScanRef.current) return;

      if (
        !isScanningThisFrame &&
        videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        !videoEl.paused &&
        !videoEl.ended
      ) {
        isScanningThisFrame = true;
        try {
          let detectedRaw: string | null = null;

          // 1. Check Hardware-Accelerated BarcodeDetector if available
          if (detector) {
            try {
              const barcodes = await detector.detect(videoEl);
              if (barcodes && barcodes.length > 0) {
                let chosen = barcodes[0];
                if (barcodes.length > 1 && videoEl.videoWidth && videoEl.videoHeight) {
                  const centerX = videoEl.videoWidth / 2;
                  const centerY = videoEl.videoHeight / 2;
                  let minDistance = Infinity;
                  for (const b of barcodes) {
                    if (b.boundingBox) {
                      const bx = b.boundingBox.x + b.boundingBox.width / 2;
                      const by = b.boundingBox.y + b.boundingBox.height / 2;
                      const dist = Math.hypot(bx - centerX, by - centerY);
                      if (dist < minDistance) {
                        minDistance = dist;
                        chosen = b;
                      }
                    }
                  }
                }
                detectedRaw = chosen?.rawValue?.trim() || null;
              }
            } catch {
              // BarcodeDetector error, proceed to high-speed optical scan
            }
          }

          // 2. High-Speed Optical jsQR Scanner (Center Crop + Scaled Frame)
          if (!detectedRaw && !isProcessingScanRef.current) {
            detectedRaw = detectCircularCodeFromVideo(videoEl);
          }

          // 3. Process detection immediately if a valid code was found
          if (detectedRaw && !isProcessingScanRef.current) {
            const rawText = detectedRaw.trim();
            const now = Date.now();
            if (
              lastProcessedCodeRef.current === rawText &&
              now - lastProcessedAtRef.current < 2500
            ) {
              // Ignore identical repeated scan within grace window
            } else {
              // STOP SCANNING IMMEDIATELY to prevent duplicate scans
              isProcessingScanRef.current = true;
              isScanningActiveRef.current = false;
              lastProcessedCodeRef.current = rawText;
              lastProcessedAtRef.current = now;

              stopContinuousScan();
              try {
                if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                  html5QrCodeRef.current.pause(true);
                }
              } catch { }

              playScanBeep();
              handleProcessCode(rawText);
              return;
            }
          }
        } catch {
          // Frame dropped or busy
        } finally {
          isScanningThisFrame = false;
        }
      }

      if (isScanningActiveRef.current && !isProcessingScanRef.current) {
        if ("requestVideoFrameCallback" in videoEl) {
          frameCallbackIdRef.current = (videoEl as any).requestVideoFrameCallback(onFrame);
        } else {
          frameCallbackIdRef.current = requestAnimationFrame(onFrame);
        }
      }
    };

    if ("requestVideoFrameCallback" in videoEl) {
      frameCallbackIdRef.current = (videoEl as any).requestVideoFrameCallback(onFrame);
    } else {
      frameCallbackIdRef.current = requestAnimationFrame(onFrame);
    }
  };

  // Stop Camera Scanner
  const stopCamera = async () => {
    stopContinuousScan();
    isProcessingScanRef.current = false;
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Error stopping camera", err);
      }
    }
    setIsCameraActive(false);
    setIsCameraLoading(false);
    setTorchOn(false);
    setActiveCameraLabel("");
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ashraysetu_scanner_state", { detail: { active: false } })
      );
    }
  };

  // Start Camera with Automatic Hardware Device Discovery & Cascading Fallback
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraLoading(true);

    // Defer camera startup until genie transition finishes so permission prompts and video startup don't stutter
    if (typeof window !== "undefined" && (window as any).__genieTransitionRunning) {
      await new Promise<void>((resolve) => {
        const onFinished = () => {
          window.removeEventListener("genie-transition-finished", onFinished);
          resolve();
        };
        window.addEventListener("genie-transition-finished", onFinished, { once: true });
        setTimeout(resolve, 600);
      });
    }

    try {
      await stopCamera();

      // Automatically discover and pick best camera behind the scenes
      let cameras: any[] = [];
      try {
        cameras = await Html5Qrcode.getCameras();
      } catch {
        // Permissions will prompt
      }

      let cameraConfig: any = { facingMode: "environment" };

      if (cameras && cameras.length > 0) {
        // Prioritize rear/environment camera on phones/tablets
        const rear = cameras.find((c) =>
          /back|rear|environment|world/i.test(c.label)
        );
        const selected = rear || cameras[0];
        cameraConfig = selected.id;
        setActiveCameraLabel(selected.label || "Integrated Camera");
      }

      // Initialize Html5Qrcode with formats limited strictly to QR_CODE for maximum speed
      const qrScanner = new Html5Qrcode("qr-camera-viewport", {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      html5QrCodeRef.current = qrScanner;

      // Optimal 720p/1080p frame configuration for ultra-low latency & 30-60fps smoothness
      const scanConfig = {
        fps: 30,
        aspectRatio: 1.0,
        videoConstraints: {
          facingMode: "environment",
          width: { ideal: 1280, max: 1920, min: 640 },
          height: { ideal: 720, max: 1080, min: 480 },
          frameRate: { ideal: 60, min: 30 },
        },
      };

      const onScanSuccess = (decodedText: string) => {
        const text = decodedText?.trim();
        if (!text || isProcessingScanRef.current) return;

        const now = Date.now();
        if (
          lastProcessedCodeRef.current === text &&
          now - lastProcessedAtRef.current < 2500
        ) {
          return;
        }

        // STOP SCANNING IMMEDIATELY to prevent duplicate scans
        isProcessingScanRef.current = true;
        isScanningActiveRef.current = false;
        lastProcessedCodeRef.current = text;
        lastProcessedAtRef.current = now;

        stopContinuousScan();
        try {
          if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.pause(true);
          }
        } catch { }

        playScanBeep();
        handleProcessCode(text);
      };

      const onScanError = () => {
        // Silent ignore frame parse noise
      };

      // Automatic Cascading Attempt
      try {
        await qrScanner.start(
          cameraConfig,
          scanConfig,
          onScanSuccess,
          onScanError
        );
      } catch (firstErr) {
        console.warn("Attempt 1 failed, trying webcam fallback...", firstErr);
        try {
          await qrScanner.start(
            { facingMode: "user" },
            scanConfig,
            onScanSuccess,
            onScanError
          );
          setActiveCameraLabel("Webcam / Front Camera");
        } catch {
          await qrScanner.start(
            { facingMode: "environment" },
            scanConfig,
            onScanSuccess,
            onScanError
          );
          setActiveCameraLabel("Default Camera");
        }
      }

      // Ensure any shaded region inserted by the library is removed to maintain a transparent viewfinder
      const shadedRegion = document.getElementById("qr-shaded-region");
      if (shadedRegion) {
        shadedRegion.remove();
      }

      setIsCameraActive(true);
      setIsCameraLoading(false);
      isScanningActiveRef.current = true;
      isProcessingScanRef.current = false;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ashraysetu_scanner_state", { detail: { active: true } })
        );
      }

      // Force video sizing to fill viewport cleanly
      const videoEl = document.querySelector<HTMLVideoElement>(
        "#qr-camera-viewport video"
      );
      if (videoEl) {
        videoEl.style.width = "100%";
        videoEl.style.height = "100%";
        videoEl.style.objectFit = "cover";
        videoEl.style.borderRadius = "1rem";
        videoEl.style.display = "block";
        videoEl.style.backgroundColor = "transparent";
        if (videoEl.paused) {
          videoEl.play().catch(() => { });
        }

        // Start ultra-fast continuous camera-frame processing immediately
        startContinuousScan();
        videoEl.addEventListener("playing", () => startContinuousScan(), {
          once: true,
        });
      }

      // Check flashlight/torch capability
      try {
        const capabilities = qrScanner.getRunningTrackCapabilities();
        setHasTorch(Boolean(capabilities && (capabilities as any).torch));
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.error("Camera startup error:", err);
      await stopCamera();

      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.message?.toLowerCase().includes("permission")
      ) {
        setCameraError(
          "Camera permission was denied. Please allow camera permissions in your browser address bar."
        );
      } else if (
        err?.name === "NotFoundError" ||
        err?.name === "DevicesNotFoundError"
      ) {
        setCameraError(
          "No camera hardware detected on this device. You can still scan passes by uploading a pass photo or using the manual entry below."
        );
      } else {
        setCameraError(
          `Unable to open camera: ${err?.message || "Please check camera permissions."}`
        );
      }
    }
  };

  // Toggle Torch/Flashlight
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

  // Unified Pass Photo Processor (Used by Drag & Drop, File Picker, and Camera Viewport Drop)
  const processUploadedFile = async (file: File) => {
    if (!file) return;

    // 1. Prevent duplicate processing of the exact same dropped file
    if (isProcessingUploadRef.current) return;

    const last = lastUploadedFileRef.current;
    const now = Date.now();
    if (
      last &&
      last.name === file.name &&
      last.size === file.size &&
      last.lastModified === file.lastModified &&
      now - last.time < 3000
    ) {
      return;
    }

    lastUploadedFileRef.current = {
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      time: now,
    };
    isProcessingUploadRef.current = true;

    // 2. Validate common image formats: PNG, JPG, JPEG, and WEBP
    const validMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const validExt = /\.(png|jpe?g|webp)$/i.test(file.name);
    if (!validMimes.includes(file.type.toLowerCase()) && !validExt) {
      setErrorMessage(
        "Unsupported format. Please upload an image file (PNG, JPG, JPEG, or WEBP)."
      );
      setUploadSuccessMessage(null);
      isProcessingUploadRef.current = false;
      return;
    }

    setErrorMessage(null);
    setUploadSuccessMessage(null);
    setIsScanningImage(true);
    setUploadedFileName(file.name);

    // 3. Show preview of the uploaded image immediately while processing
    if (previewUrlRef.current) {
      try {
        URL.revokeObjectURL(previewUrlRef.current);
      } catch { }
    }
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setUploadedImagePreview(previewUrl);

    try {
      // Step 1: Detect circular or standard optical QR pass (PNG chunk, BarcodeDetector, multi-scale jsQR, watermark)
      let rawResult = await detectCircularCodeFromFile(file);

      // Step 2: Fall back to standard Html5Qrcode if needed
      if (!rawResult) {
        try {
          const scanner = new Html5Qrcode("qr-hidden-file-sink");
          rawResult = await scanner.scanFile(file, true);
          try {
            await scanner.clear();
          } catch { }
        } catch {
          // Html5Qrcode failed to detect
        }
      }

      if (rawResult && rawResult.trim().includes("|")) {
        const cleanRaw = rawResult.trim();
        playScanBeep();
        const decoded = decodeQRPayload(cleanRaw);
        if (decoded) {
          setUploadSuccessMessage(
            `✓ Pass #${decoded.shortRef.toUpperCase()} detected successfully!`
          );
        } else {
          setUploadSuccessMessage("✓ QR code pass detected successfully!");
        }

        // Pause camera continuous scanning if running to prevent conflicting reads
        if (isCameraActive) {
          stopContinuousScan();
          try {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
              html5QrCodeRef.current.pause(true);
            }
          } catch { }
        }

        // Full authoritative backend validation, timestamp recording, timer freeze
        await handleProcessCode(cleanRaw);
      } else {
        setErrorMessage(
          "No valid QR code pass detected in the selected image file."
        );
        setUploadSuccessMessage(null);
      }
    } catch (err: any) {
      setErrorMessage(
        "No valid QR code pass detected in the selected image file."
      );
      setUploadSuccessMessage(null);
    } finally {
      setIsScanningImage(false);
      isProcessingUploadRef.current = false;
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // File Upload via Input Trigger
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Drag and Drop Event Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processUploadedFile(files[0]);
    }
  };

  // Clean up camera and object URLs on unmount
  useEffect(() => {
    return () => {
      stopContinuousScan();
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => { });
          }
          html5QrCodeRef.current.clear();
        } catch { }
      }
      if (previewUrlRef.current) {
        try {
          URL.revokeObjectURL(previewUrlRef.current);
        } catch { }
      }
    };
  }, []);

  // Process & Retrieve Household Intake Details + STOP TIME FOR ACCURATE RECORD
  const handleProcessCode = async (codeText: string) => {
    // 1. FREEZE AND STOP TIME AT THE EXACT SECOND OF SCAN!
    setIsClockRunning(false);
    const scanMoment = Date.now();
    setScannedAtTimestamp(scanMoment);

    setErrorMessage(null);
    setIsAdmitted(false);
    const decoded = decodeQRPayload(codeText.trim());

    if (!decoded) {
      setErrorMessage(
        "Invalid or corrupted QR evacuation token format. Please re-scan."
      );
      setScannedResult(null);
      setMatchedHousehold(null);
      setMatchedTriage(null);
      setExistingAdmission(null);
      setScanAuditRecord(null);
      isProcessingScanRef.current = false;
      return;
    }

    setScannedResult(decoded);

    // 2. Authoritative Backend QR Scan Record
    let backendScan: any = null;
    try {
      const res = await fetch("/api/qr/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          short_ref: decoded.shortRef,
          head_name: decoded.headName,
          hamlet_name: decoded.hamletName,
          shelter_id: selectedShelterId,
          total_members: decoded.totalMembers,
          qr_created_at: decoded.createdAt,
          qr_payload: codeText.trim(),
        }),
      });
      if (res.ok) {
        backendScan = await res.json();
      }
    } catch (e) {
      console.warn("Backend /api/qr/scan offline or error, falling back locally", e);
    }

    // Optical QR pass creation timestamp (ground truth from encoded pass)
    const authoritativeCreatedAt =
      decoded.createdAt && decoded.createdAt > 0
        ? decoded.createdAt
        : backendScan?.qr_created_at || scanMoment;

    // Exact actual scan instant
    const authoritativeScannedAt = backendScan?.qr_scanned_at || scanMoment;

    // Actual duration taken to reach shelter
    const arrivalSeconds =
      backendScan?.arrival_duration_seconds != null
        ? backendScan.arrival_duration_seconds
        : Math.max(0, Math.floor((authoritativeScannedAt - authoritativeCreatedAt) / 1000));

    const audit: ScanAuditRecord = {
      short_ref: decoded.shortRef,
      qr_created_at: authoritativeCreatedAt,
      qr_scanned_at: authoritativeScannedAt,
      arrival_duration_seconds: arrivalSeconds,
      status: "REACHED_SHELTER",
      duplicate: backendScan?.duplicate || false,
      scan_count: backendScan?.scan_count || 1,
    };

    setScanAuditRecord(audit);
    setScannedAtTimestamp(authoritativeScannedAt);
    setElapsedTimerSeconds(arrivalSeconds);

    try {
      sessionStorage.setItem("ashraysetu_last_scan_audit", JSON.stringify(audit));
      sessionStorage.setItem("ashraysetu_last_scanned_result", JSON.stringify(decoded));
      sessionStorage.setItem("ashraysetu_last_scanned_ref", decoded.shortRef);
    } catch { }

    // Freeze display clock at this exact authoritative second
    const frozenString = new Date(authoritativeScannedAt).toLocaleString("en-IN", {
      timeZone: detectedTimeZone,
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    setCurrentClockDisplay(`${frozenString} (${timeZoneShort})`);

    // Look up full household intake from Dexie database
    try {
      const allHouseholds = await db.households.toArray();
      const household = allHouseholds.find(
        (h) =>
          h.id.startsWith(decoded.shortRef) ||
          h.head_name.toLowerCase().trim() ===
          (decoded.headName || "").toLowerCase().trim()
      );
      setMatchedHousehold(household || null);

      let resolvedTriage: EvacueeTriage | null = null;
      if (household) {
        const triage = await db.triage
          .where("household_id")
          .equals(household.id)
          .first();
        resolvedTriage = triage || null;
      } else {
        const triage = await db.triage
          .where("id")
          .equals(`triage-${decoded.shortRef}`)
          .first();
        resolvedTriage = triage || null;
      }
      setMatchedTriage(resolvedTriage);

      const targetShelterId =
        selectedShelterId ||
        decoded.shelterId ||
        (shelters.length > 0 ? shelters[0].id : "OD-KEN-RAJ-001");

      // STRICT IDEMPOTENCY CHECK: Search across ALL shelters in Dexie admissions
      const allAdmissions = await db.admissions.toArray();
      const existing = allAdmissions.find((adm) => {
        if (!adm) return false;
        const matchToken = adm.household_token && (
          adm.household_token.toLowerCase() === decoded.shortRef.toLowerCase() ||
          adm.household_token.toLowerCase() === codeText.trim().toLowerCase()
        );
        const matchName = decoded.headName && adm.head_name && (
          adm.head_name.trim().toLowerCase() === decoded.headName.trim().toLowerCase() &&
          (!adm.hamlet_name || !decoded.hamletName || adm.hamlet_name.trim().toLowerCase() === decoded.hamletName.trim().toLowerCase())
        );
        return Boolean(matchToken || matchName);
      });

      const isHouseholdArrived = Boolean(
        household && (
          household.status === "REACHED_SHELTER" ||
          Boolean(household.qr_scanned_at)
        )
      );

      const isDuplicate = Boolean(
        existing ||
        isHouseholdArrived ||
        backendScan?.duplicate ||
        (backendScan?.scan_count && backendScan.scan_count > 1)
      );

      setExistingAdmission(existing || null);

      if (isDuplicate) {
        setIsAdmitted(true);
        setIsDuplicateScan(true);

        const admittedShelterId = existing?.shelter_id || household?.shelter_id || targetShelterId;
        const admittedShelter = shelters.find((s) => s.id === admittedShelterId);
        const firstTime =
          existing?.admitted_at ||
          household?.qr_scanned_at ||
          backendScan?.first_scanned_at ||
          authoritativeScannedAt;

        const effectiveScanCount =
          backendScan?.scan_count ||
          (audit.scan_count && audit.scan_count > 1 ? audit.scan_count : (existing ? 2 : 1));

        setDuplicateNotice({
          firstAdmittedAt: firstTime,
          shelterId: admittedShelterId,
          shelterName: admittedShelter?.name || currentShelter?.name || "Official Cyclone Shelter",
          scanCount: effectiveScanCount,
          preventedMembers: decoded.totalMembers,
          preventedWater: Number((decoded.totalMembers * 3.0).toFixed(1)),
          preventedFood: decoded.totalMembers * 2,
        });

        // Update audit record to reflect duplicate scan status
        const updatedAudit: ScanAuditRecord = {
          ...audit,
          duplicate: true,
          scan_count: effectiveScanCount,
        };
        setScanAuditRecord(updatedAudit);

        // Audible gatekeeper warning alert for duplicate scan
        playWarningBeep();
      } else {
        setIsDuplicateScan(false);
        setDuplicateNotice(null);

        // AUTOMATICALLY UPGRADE SHELTER STOCKS ON FIRST SCAN ONLY!
        await executeShelterStockUpgrade(
          decoded,
          audit,
          targetShelterId,
          household || null,
          resolvedTriage
        );
      }

      // Smooth scroll to intake dossier & stock upgrade confirmation card
      setTimeout(() => {
        const el = document.getElementById("intake-dossier-card");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          const scrollContainer = document.querySelector('div[role="dialog"] .overflow-y-auto') as HTMLElement | null;
          if (scrollContainer) {
            const relTop = el.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top;
            scrollContainer.scrollBy({
              top: relTop - 20,
              behavior: "smooth",
            });
          }
        }
      }, 150);
    } catch (err) {
      console.error("Dexie lookup / stock upgrade error:", err);
    }
  };

  // Automated Shelter Stocks Upgrade Engine
  const executeShelterStockUpgrade = async (
    decodedPass: QRPayloadData,
    auditRecord: ScanAuditRecord | null,
    shelterId: string,
    household: Household | null,
    triage: EvacueeTriage | null
  ) => {
    try {
      // 0. STRICT IDEMPOTENCY LOCK: Never double-count or re-upgrade stocks for an already admitted pass
      const allAdmissions = await db.admissions.toArray();
      const priorAdmission = allAdmissions.find((adm) => {
        if (!adm) return false;
        const matchToken = adm.household_token && (
          adm.household_token.toLowerCase() === decodedPass.shortRef.toLowerCase()
        );
        const matchName = decodedPass.headName && adm.head_name && (
          adm.head_name.trim().toLowerCase() === decodedPass.headName.trim().toLowerCase() &&
          (!adm.hamlet_name || !decodedPass.hamletName || adm.hamlet_name.trim().toLowerCase() === decodedPass.hamletName.trim().toLowerCase())
        );
        return Boolean(matchToken || matchName);
      });

      if (priorAdmission) {
        console.warn(`[IDEMPOTENCY SAFEGUARD] Household ${decodedPass.shortRef} was ALREADY admitted at shelter ${priorAdmission.shelter_id}. Aborting duplicate stock/occupancy addition.`);
        setExistingAdmission(priorAdmission);
        setIsAdmitted(true);
        setIsDuplicateScan(true);
        return priorAdmission;
      }

      const allShelters = await db.shelters.toArray();
      const targetShelter =
        (shelterId ? allShelters.find((s) => s.id === shelterId) : null) ||
        (decodedPass.shelterId ? allShelters.find((s) => s.id === decodedPass.shelterId) : null) ||
        currentShelter ||
        allShelters[0] ||
        null;

      if (!targetShelter) {
        console.warn("No target shelter resolved for stock upgrade");
        return null;
      }

      const activeShelterId = targetShelter.id;
      if (!selectedShelterId || selectedShelterId !== activeShelterId) {
        setSelectedShelterId(activeShelterId);
      }

      const prevOccupancy = targetShelter.current_occupancy;
      const newOccupancy = prevOccupancy + decodedPass.totalMembers;

      // 1. Upgrade Shelter Muster Occupancy
      await db.shelters.update(activeShelterId, {
        current_occupancy: newOccupancy,
        status: newOccupancy >= targetShelter.capacity_persons ? "SATURATED" : targetShelter.status,
      });

      // 2. Compute Triage & Clinical Category
      let triageCategory = "P3_STANDARD";
      if (decodedPass.triageCode.startsWith("P1")) triageCategory = "P1_CRITICAL";
      else if (decodedPass.triageCode.startsWith("P2")) triageCategory = "P2_URGENT";

      const admissionTime = auditRecord?.qr_scanned_at || Date.now();
      const qrCreatedAt =
        auditRecord?.qr_created_at ||
        decodedPass.createdAt ||
        (admissionTime - (7 * 60 + 35) * 1000);
      const arrivalDuration =
        auditRecord?.arrival_duration_seconds != null
          ? auditRecord.arrival_duration_seconds
          : Math.max(0, Math.floor((admissionTime - qrCreatedAt) / 1000));

      // 3. Sphere Humanitarian Standards Ration Calculations
      const rationWater = Number((decodedPass.totalMembers * 3.0).toFixed(1)); // 3L/person/day
      const rationFood = decodedPass.totalMembers * 2; // 2 meals/person/day
      const rationFormula = (decodedPass.infantCount || 0) * 1;
      const rationOrs = Math.max(0, (decodedPass.elderlyCount || 0) * 2);

      // 4. Upgrade / Deduct Stocks in db.inventory
      // Water
      const waterItem = await db.inventory.get(`${shelterId}_WATER_LITRES`);
      if (waterItem) {
        const updatedWater = Math.max(0, Math.round((waterItem.quantity_available - rationWater) * 10) / 10);
        await db.inventory.update(waterItem.id, {
          quantity_available: updatedWater,
          daily_burn_rate: Number((newOccupancy * 3.0).toFixed(1)),
          last_updated: admissionTime,
        });
      }

      // Food Packets
      const foodItem = await db.inventory.get(`${shelterId}_FOOD_PACKETS`);
      if (foodItem) {
        const updatedFood = Math.max(0, foodItem.quantity_available - rationFood);
        await db.inventory.update(foodItem.id, {
          quantity_available: updatedFood,
          daily_burn_rate: newOccupancy * 2.0,
          last_updated: admissionTime,
        });
      }

      // Baby Formula
      if (rationFormula > 0) {
        const formulaItem = await db.inventory.get(`${shelterId}_BABY_FORMULA`);
        if (formulaItem) {
          const updatedFormula = Math.max(0, formulaItem.quantity_available - rationFormula);
          await db.inventory.update(formulaItem.id, {
            quantity_available: updatedFormula,
            last_updated: admissionTime,
          });
        }
      }

      // ORS Sachets
      if (rationOrs > 0) {
        const orsItem = await db.inventory.get(`${shelterId}_ORS_SACHETS`);
        if (orsItem) {
          const updatedOrs = Math.max(0, orsItem.quantity_available - rationOrs);
          await db.inventory.update(orsItem.id, {
            quantity_available: updatedOrs,
            last_updated: admissionTime,
          });
        }
      }

      // 5. Create Shelter Admission Record
      const admissionRecord: ShelterAdmission = {
        id: crypto.randomUUID(),
        shelter_id: shelterId,
        household_token: decodedPass.shortRef,
        head_name: decodedPass.headName || "Unknown Head",
        hamlet_name: decodedPass.hamletName || "Coastal Hamlet",
        ward_number: household?.ward_number || 1,
        total_members: decodedPass.totalMembers,
        male_count: decodedPass.maleCount,
        female_count: decodedPass.femaleCount,
        child_under_five_count: decodedPass.infantCount,
        elderly_above_sixty_count: decodedPass.elderlyCount,
        livestock_count: decodedPass.livestockCount,
        triage_code: decodedPass.triageCode,
        triage_level: triage?.triage_level || triageCategory,
        admitted_at: admissionTime,
        qr_created_at: qrCreatedAt,
        qr_scanned_at: admissionTime,
        arrival_duration_seconds: arrivalDuration,
        status: "REACHED_SHELTER",
        clinical_notes:
          triage?.notes ||
          (decodedPass.triageCode.includes("PREG")
            ? "Maternity Care: Third trimester pregnancy triage flagged."
            : decodedPass.triageCode.includes("BED")
              ? "Geriatric/Mobility: Bedridden patient requiring ground floor cot."
              : decodedPass.triageCode.includes("CHRONIC")
                ? "Chronic Medication: Insulin/dialysis maintenance flagged."
                : undefined),
        ration_water_litres: rationWater,
        ration_food_packets: rationFood,
      };

      await db.admissions.add(admissionRecord);

      // 6. Update Household record
      if (household) {
        await db.households.update(household.id, {
          qr_scanned_at: admissionTime,
          arrival_duration_seconds: arrivalDuration,
          status: "REACHED_SHELTER",
        });
      }

      // 7. Trigger Cross-Window Event & LocalStorage Persistence
      const notice = {
        shelterId: targetShelter.id,
        shelterName: targetShelter.name,
        shortRef: decodedPass.shortRef,
        headName: decodedPass.headName,
        hamletName: decodedPass.hamletName,
        addedMembers: decodedPass.totalMembers,
        prevOccupancy,
        newOccupancy,
        capacityPersons: targetShelter.capacity_persons,
        rationWater,
        rationFood,
        rationFormula,
        rationOrs,
        timestamp: admissionTime,
      };

      window.dispatchEvent(
        new CustomEvent("ashraysetu_inventory_updated", { detail: notice })
      );

      try {
        localStorage.setItem(
          "ashraysetu_last_inventory_upgrade",
          JSON.stringify(notice)
        );
      } catch { }

      setAutoUpgradedStockNotice(notice);
      setExistingAdmission(admissionRecord);
      setIsAdmitted(true);
      setIsDuplicateScan(false);
      setDuplicateNotice(null);

      await refreshData();
      await loadAdmissions(shelterId);

      return admissionRecord;
    } catch (err) {
      console.error("Auto upgrade shelter stocks error:", err);
      return null;
    }
  };

  // Reset & Scan Next Evacuee (Resumes live clock & ultra-fast scanner)
  const handleScanNext = () => {
    setScannedResult(null);
    setManualCode("");
    setMatchedHousehold(null);
    setMatchedTriage(null);
    setExistingAdmission(null);
    setIsAdmitted(false);
    setIsDuplicateScan(false);
    setDuplicateNotice(null);
    setAutoUpgradedStockNotice(null);
    setScannedAtTimestamp(null);
    setScanAuditRecord(null);
    setElapsedTimerSeconds(0);
    setUploadedImagePreview(null);
    setUploadedFileName("");
    setUploadSuccessMessage(null);
    lastUploadedFileRef.current = null;
    if (previewUrlRef.current) {
      try {
        URL.revokeObjectURL(previewUrlRef.current);
      } catch { }
      previewUrlRef.current = null;
    }
    try {
      sessionStorage.removeItem("ashraysetu_last_scan_audit");
      localStorage.removeItem("ashraysetu_last_scan_audit");
      sessionStorage.removeItem("ashraysetu_last_scanned_result");
      localStorage.removeItem("ashraysetu_last_scanned_result");
      sessionStorage.removeItem("ashraysetu_last_scanned_ref");
      localStorage.removeItem("ashraysetu_last_scanned_ref");
    } catch { }
    setIsClockRunning(true); // RESUME LIVE CLOCK!

    // Reset duplicate & scanning locks for next pass
    isProcessingScanRef.current = false;
    lastProcessedCodeRef.current = null;
    isScanningActiveRef.current = true;

    if (!isCameraActive) {
      startCamera();
    } else {
      if (
        html5QrCodeRef.current &&
        html5QrCodeRef.current.getState() === Html5QrcodeScannerState.PAUSED
      ) {
        try {
          html5QrCodeRef.current.resume();
        } catch { }
      }
      startContinuousScan();
    }
  };

  // Confirm Admission & Increment Shelter Headcount (Fallback manual action)
  const handleConfirmAdmission = async () => {
    if (!scannedResult || !currentShelter) return;
    if (isAdmitted || isDuplicateScan || existingAdmission) {
      alert("This evacuee pass is already admitted to safe shelter. Re-admission is blocked to prevent double-counting headcount and rations.");
      return;
    }
    await executeShelterStockUpgrade(
      scannedResult,
      scanAuditRecord,
      selectedShelterId,
      matchedHousehold,
      matchedTriage
    );
    playScanBeep();
  };

  // Revert / Undo Admission & Restore Shelter Stocks
  const handleUndoAdmission = async (admissionId: string) => {
    if (
      !confirm(
        "Are you sure you want to revert this admission and restore the allocated stocks to the shelter inventory?"
      )
    ) {
      return;
    }

    try {
      const record = await db.admissions.get(admissionId);
      if (record && currentShelter) {
        const revisedOccupancy = Math.max(
          0,
          currentShelter.current_occupancy - record.total_members
        );
        await db.shelters.update(selectedShelterId, {
          current_occupancy: revisedOccupancy,
        });

        // Restore inventory commodities
        const waterRation = record.ration_water_litres || record.total_members * 3.0;
        const foodRation = record.ration_food_packets || record.total_members * 2;

        const waterItem = await db.inventory.get(`${selectedShelterId}_WATER_LITRES`);
        if (waterItem) {
          await db.inventory.update(waterItem.id, {
            quantity_available: Number((waterItem.quantity_available + waterRation).toFixed(1)),
            daily_burn_rate: Number((revisedOccupancy * 3.0).toFixed(1)),
            last_updated: Date.now(),
          });
        }

        const foodItem = await db.inventory.get(`${selectedShelterId}_FOOD_PACKETS`);
        if (foodItem) {
          await db.inventory.update(foodItem.id, {
            quantity_available: foodItem.quantity_available + foodRation,
            daily_burn_rate: revisedOccupancy * 2.0,
            last_updated: Date.now(),
          });
        }

        await db.admissions.delete(admissionId);

        // Broadcast revert event
        const revertNotice = {
          shelterId: selectedShelterId,
          shelterName: currentShelter.name,
          shortRef: record.household_token,
          headName: record.head_name,
          addedMembers: -record.total_members,
          prevOccupancy: currentShelter.current_occupancy,
          newOccupancy: revisedOccupancy,
          capacityPersons: currentShelter.capacity_persons,
          rationWater: -waterRation,
          rationFood: -foodRation,
          rationFormula: 0,
          rationOrs: 0,
          timestamp: Date.now(),
          isRevert: true,
        };

        window.dispatchEvent(
          new CustomEvent("ashraysetu_inventory_updated", { detail: revertNotice })
        );

        try {
          localStorage.setItem(
            "ashraysetu_last_inventory_upgrade",
            JSON.stringify(revertNotice)
          );
        } catch { }

        await refreshData();
        await loadAdmissions(selectedShelterId);

        if (scannedResult && scannedResult.shortRef === record.household_token) {
          setIsAdmitted(false);
          setIsDuplicateScan(false);
          setDuplicateNotice(null);
          setExistingAdmission(null);
          setAutoUpgradedStockNotice(null);
        }
      }
    } catch (err) {
      console.error("Undo error:", err);
    }
  };

  // Calculate shift totals
  const totalShiftEvacuees = admissions.reduce(
    (sum, a) => sum + a.total_members,
    0
  );
  const totalShiftHouseholds = admissions.length;
  const totalShiftInfants = admissions.reduce(
    (sum, a) => sum + a.child_under_five_count,
    0
  );
  const totalShiftElderly = admissions.reduce(
    (sum, a) => sum + a.elderly_above_sixty_count,
    0
  );
  const totalShiftLivestock = admissions.reduce(
    (sum, a) => sum + a.livestock_count,
    0
  );
  const totalShiftCritical = admissions.filter(
    (a) => a.triage_level === "P1_CRITICAL"
  ).length;

  const currentCapacity = currentShelter?.capacity_persons || 600;
  const currentOccupancy = currentShelter?.current_occupancy || 0;
  const occupancyPercent = Math.min(
    100,
    Math.round((currentOccupancy / currentCapacity) * 100)
  );
  const remainingSpots = Math.max(0, currentCapacity - currentOccupancy);

  const filteredAdmissions = admissions.filter(
    (a) =>
      a.head_name.toLowerCase().includes(searchMuster.toLowerCase()) ||
      a.hamlet_name.toLowerCase().includes(searchMuster.toLowerCase()) ||
      a.household_token.toLowerCase().includes(searchMuster.toLowerCase())
  );

  const now = Date.now();
  const samplePass1 = `V1|OD-KEN-RAJ-001|c4b1|5|2|2|1|0|2|P1_PREG|Pravat Kumar Nayak|Talachua|${now - (7 * 60 + 35) * 1000}`;
  const samplePass2 = `V1|OD-KEN-RAJ-001|9e2a|6|2|3|0|1|4|P1_BED|Bishnu Charan Das|Batighar Para|${now - (14 * 60 + 10) * 1000}`;
  const samplePass3 = `V1|AP-SHELTER-VSP-001|7f1c|4|1|2|1|0|1|P2_INF|K. Appala Naidu|Bheemili Fishermen Colony|${now - (19 * 60 + 40) * 1000}`;
  const samplePass4 = `V1|AP-SHELTER-WGD-010|3d4e|3|1|1|0|1|0|P1_CHRONIC|M. Subba Rao|Perupalem Beach|${now - (27 * 60 + 15) * 1000}`;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      {/* Hidden File Sink for Image QR Decoding */}
      <div id="qr-hidden-file-sink" className="hidden" />

      {/* TOP BANNER: SHELTER SELECTION, TIMEZONE CLOCK & CAPACITY */}
      <div className="p-6 sm:p-7 rounded-[40px] glass-header-panel space-y-5 relative overflow-hidden">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl glass-l3 text-[#007AFF] border border-white/60 flex items-center justify-center shadow-xs shrink-0">
              <QrCode className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                <span>{t.scanTitle}</span>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full glass-l1 bg-emerald-500/20 text-emerald-900 border border-emerald-400/60">
                  OFFLINE MUSTER
                </span>
              </h1>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                Optical QR Scanner • Real-time Headcount Admission Ledger
              </p>
            </div>
          </div>

          {/* View Tab Selector */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-full glass-l1 border border-white/50 shadow-inner self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("scanner")}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all duration-250 select-none cursor-pointer border flex items-center gap-2",
                activeTab === "scanner"
                  ? "glass-pill-tab-all-active"
                  : "text-slate-700 hover:text-slate-950 hover:bg-white/40 border-transparent"
              )}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Scanner</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("muster")}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all duration-250 select-none cursor-pointer border flex items-center gap-2",
                activeTab === "muster"
                  ? "glass-pill-tab-all-active"
                  : "text-slate-700 hover:text-slate-950 hover:bg-white/40 border-transparent"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Who Entered ({admissions.length})</span>
            </button>
          </div>
        </div>

        {/* Dynamic System Timezone & Accurate Scan Time Lock Bar with Live/Frozen Arrival Timer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl glass-l1 border border-white/60 text-xs shadow-inner relative z-10 text-slate-800">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              {isClockRunning ? (
                <Clock className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="font-semibold text-slate-600">
                {isClockRunning
                  ? "Live Shelter Gate Clock:"
                  : "Scan Time (Locked & Frozen):"}
              </span>
              <span
                className={cn(
                  "font-mono font-black",
                  isClockRunning ? "text-emerald-800" : "text-amber-800"
                )}
              >
                {currentClockDisplay || "Detecting time..."}
              </span>
            </div>

            {/* LIVE / FROZEN ARRIVAL DURATION TIMER */}
            <div className="flex items-center gap-2 pl-3 border-l border-white/40">
              <span className="font-semibold text-slate-600">
                {isClockRunning ? "Transit Timer:" : "Time Taken to Reach:"}
              </span>
              <span
                className={cn(
                  "font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-lg border",
                  isClockRunning
                    ? "glass-l1 bg-sky-500/20 text-sky-900 border-sky-400/60 animate-pulse"
                    : "glass-l1 bg-emerald-500/20 text-emerald-900 border-emerald-400/60"
                )}
              >
                {scanAuditRecord
                  ? formatDuration(scanAuditRecord.arrival_duration_seconds)
                  : formatDuration(elapsedTimerSeconds)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isClockRunning ? (
              <span className="flex items-center gap-1.5 text-[10px] font-mono glass-l1 bg-emerald-500/20 border border-emerald-400/50 px-2.5 py-1 rounded-full text-emerald-900 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                TIMER RUNNING
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-mono glass-l1 bg-amber-500/20 border border-amber-400/50 px-2.5 py-1 rounded-full text-amber-900 font-bold">
                <Lock className="w-3 h-3 text-amber-600" />
                TIMER FROZEN AT SCAN
              </span>
            )}
            <span className="text-[10px] font-mono glass-l1 px-2.5 py-0.5 rounded-full text-slate-700 border border-white/60 uppercase font-semibold">
              {timeZoneShort}
            </span>
          </div>
        </div>

        {/* Operating Shelter Selector */}
        <div className="pt-3 border-t border-white/40 space-y-2 relative z-10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>{t.selectShelter}</span>
              <span className="text-[11px] text-slate-500">
                ({shelters.length} Coastal Shelters Available)
              </span>
            </label>
            <span className="text-[11px] font-mono font-bold text-[#007AFF]">
              ID: {selectedShelterId || "N/A"}
            </span>
          </div>
          <select
            value={selectedShelterId}
            onChange={(e) => setSelectedShelterId(e.target.value)}
            className="w-full glass-select rounded-2xl px-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition shadow-inner cursor-pointer"
          >
            {shelters.map((s) => (
              <option key={s.id} value={s.id} className="bg-white text-slate-900">
                [{s.state === "ANDHRA_PRADESH" ? "AP" : "OD"}] {s.name} — {s.district} (Occupancy: {s.current_occupancy}/{s.capacity_persons})
              </option>
            ))}
          </select>
        </div>

        {/* Real-time Shelter Capacity Bar */}
        {currentShelter && (
          <div className="p-4 rounded-2xl glass-l1 border border-white/60 space-y-2.5 relative z-10 text-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-bold">
                Shelter Capacity Status:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-950 text-sm">
                  {currentOccupancy}{" "}
                  <span className="text-slate-500 text-xs font-normal">
                    / {currentCapacity} Persons
                  </span>
                </span>
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono glass-l1 border",
                    occupancyPercent >= 90
                      ? "bg-rose-500/20 text-rose-900 border-rose-400/60"
                      : occupancyPercent >= 75
                      ? "bg-amber-500/20 text-amber-900 border-amber-400/60"
                      : "bg-emerald-500/20 text-emerald-900 border-emerald-400/60"
                  )}
                >
                  {occupancyPercent}% FULL
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-200/80 border border-white/80 overflow-hidden relative shadow-inner">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  occupancyPercent >= 90
                    ? "bg-rose-500 shadow-md shadow-rose-500/50"
                    : occupancyPercent >= 75
                    ? "bg-amber-500 shadow-md shadow-amber-500/50"
                    : "bg-emerald-500 shadow-md shadow-emerald-500/50"
                )}
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 font-medium">
              <span>
                Available Vacancy:{" "}
                <strong className="text-emerald-800 font-bold font-mono">
                  {remainingSpots} Remaining
                </strong>
              </span>
              <span>
                Admitted This Gate Shift:{" "}
                <strong className="text-[#007AFF] font-bold font-mono">
                  +{totalShiftEvacuees} Persons ({totalShiftHouseholds} Families)
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {activeTab === "scanner" ? (
        <>
          {/* CAMERA SCANNER VIEWPORT */}
          <div className="p-6 sm:p-7 rounded-[38px] glass-l2 border border-white/60 shadow-lg space-y-5 relative">
            <div className="flex flex-wrap items-center justify-between gap-2 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl glass-l3 text-[#007AFF] border border-white/60 flex items-center justify-center shadow-xs">
                  <Camera className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h2 className="text-base font-black text-slate-950 uppercase tracking-tight">
                  Live Camera Feed
                </h2>
              </div>

              {/* Camera Status & Active Controls */}
              {isCameraActive ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    LIVE SCANNER
                  </span>

                  {hasTorch && (
                    <button
                      onClick={toggleTorch}
                      className={`p-1.5 rounded-lg border text-xs transition ${torchOn
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                        }`}
                      title="Toggle Flashlight / Torch"
                    >
                      <Flashlight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={stopCamera}
                    className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs transition"
                    title="Stop Camera Feed"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-[11px] font-mono text-slate-500">
                  CAMERA STANDBY
                </span>
              )}
            </div>

            {/* FIXED CAMERA MOUNT VIEWPORT */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative w-full max-w-sm mx-auto aspect-square rounded-2xl bg-slate-950 border-2 transition-all duration-200 overflow-hidden shadow-2xl ${
                isDragging
                  ? "border-emerald-400 ring-4 ring-emerald-500/30 scale-[1.01]"
                  : "border-slate-800"
              }`}
            >
              {/* Permanent Mount Element: Always rendered with fixed dimensions */}
              <div
                id="qr-camera-viewport"
                className="absolute inset-0 w-full h-full bg-black overflow-hidden flex items-center justify-center rounded-2xl"
              />

              {/* DRAG-OVER HUD OVERLAY */}
              {isDragging && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/90 border-2 border-emerald-400 rounded-2xl backdrop-blur-sm pointer-events-none space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="text-sm font-bold text-emerald-300 tracking-wide uppercase">
                    ✓ DROP IMAGE TO SCAN
                  </div>
                  <p className="text-xs text-emerald-400/80 font-medium">
                    Release to scan QR pass
                  </p>
                </div>
              )}

              {/* SCANNING UPLOADED IMAGE HUD */}
              {isScanningImage && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/95 rounded-2xl backdrop-blur-sm pointer-events-none space-y-3">
                  {uploadedImagePreview && (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-sky-500/50 shadow-lg shadow-sky-500/20 bg-black">
                      <img
                        src={uploadedImagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 bg-sky-950/30" />
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-md shadow-sky-400 animate-scan-laser" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sky-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-bold">Scanning QR...</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Detecting QR code in uploaded image...
                  </p>
                </div>
              )}

              {/* OVERLAY HUD WHEN CAMERA IS ACTIVE */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center p-6">
                  {/* Corner Targeting Brackets */}
                  <div className="relative w-56 h-56 pointer-events-none">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg shadow-sm shadow-emerald-400/50" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg shadow-sm shadow-emerald-400/50" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg shadow-sm shadow-emerald-400/50" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg shadow-sm shadow-emerald-400/50" />

                    {/* Laser Scanning Line Animation */}
                    <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/80 rounded animate-scan-laser" />
                  </div>

                  <div className="mt-3 px-4 py-1.5 rounded-full lg-base lg-clear text-[11px] font-bold text-white shadow-xl flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {activeCameraLabel
                        ? `Scanning via ${activeCameraLabel}`
                        : "Align QR Pass Token in Target Square"}
                    </span>
                  </div>
                </div>
              )}

              {/* PLACEHOLDER CARD WHEN CAMERA IS INACTIVE */}
              {!isCameraActive && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-950 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Camera Scanner Ready
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Click below to activate camera and scan evacuee QR passes in real-time.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2 w-full">
                    <button
                      onClick={startCamera}
                      disabled={isCameraLoading}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                    >
                      {isCameraLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Connecting Camera...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>Activate Gate Camera</span>
                        </>
                      )}
                    </button>

                    {/* COMBINED DRAG & DROP + CLICK UPLOAD PASS PHOTO BUTTON */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold text-xs transition-all duration-150 border flex items-center justify-center gap-2 select-none ${
                        isDragging
                          ? "bg-emerald-950 border-emerald-400 text-emerald-300 ring-4 ring-emerald-500/40 scale-105 shadow-lg shadow-emerald-500/30"
                          : isScanningImage
                          ? "bg-sky-950/80 border-sky-500/50 text-sky-300 ring-2 ring-sky-500/20"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600"
                      }`}
                      title="Click to browse or drag & drop pass image here (PNG, JPG, JPEG, WEBP)"
                    >
                      {isDragging ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                          <span className="font-bold text-emerald-300">Drop Image to Scan</span>
                        </>
                      ) : isScanningImage ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                          <span>Scanning QR...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-sky-400" />
                          <span>Upload Pass Photo</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Permanent hidden file input for all upload triggers */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Camera Running Controls Bar (Liquid Glass Control Capsule) */}
            {isCameraActive && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <div className="lg-base lg-control p-1 inline-flex items-center gap-1.5 shadow-xl">
                  <button
                    onClick={stopCamera}
                    className="lg-inner-item px-3.5 py-1.5 rounded-full text-rose-300 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4 text-rose-400" />
                    <span>Pause Camera</span>
                  </button>

                  {/* COMBINED DRAG & DROP UPLOAD BUTTON WHEN CAMERA RUNNING */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`lg-inner-item px-3.5 py-1.5 rounded-full text-xs transition flex items-center gap-1.5 select-none ${
                      isDragging
                        ? "bg-emerald-500/30 text-emerald-200 ring-2 ring-emerald-400"
                        : isScanningImage
                        ? "bg-sky-500/30 text-sky-200"
                        : "text-slate-200 hover:text-white"
                    }`}
                    title="Click to browse or drag & drop pass image here (PNG, JPG, JPEG, WEBP)"
                  >
                    {isDragging ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                        <span className="font-bold text-emerald-300">Drop Image to Scan</span>
                      </>
                    ) : isScanningImage ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                        <span>Scanning QR...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-sky-400" />
                        <span>Upload Pass Photo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Upload Success Notice */}
            {uploadSuccessMessage && uploadedImagePreview && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-emerald-500/50 bg-black shrink-0">
                    <img
                      src={uploadedImagePreview}
                      alt="Scanned Pass"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{uploadSuccessMessage}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                      {uploadedFileName || "Uploaded pass image"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] underline font-medium text-emerald-400 hover:text-white shrink-0"
                >
                  Upload another
                </button>
              </div>
            )}

            {/* Camera Permission / Error Alert */}
            {cameraError && (
              <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Camera Access Notice</div>
                  <div className="text-amber-300/90 leading-relaxed">
                    {cameraError}
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={startCamera}
                      className="text-[11px] underline font-bold hover:text-white"
                    >
                      Retry Camera Activation
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message for Invalid Pass */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* MANUAL CODE ENTRY / QUICK TEST BUTTONS */}
            <div className="pt-4 border-t border-white/40 space-y-3.5 relative z-10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Paste or enter raw pass token (e.g. V1|OD-KEN-RAJ-001|c4b1...)"
                  className="flex-1 glass-input rounded-2xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 font-mono font-semibold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleProcessCode(manualCode)}
                  className="px-5 py-2.5 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs whitespace-nowrap shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer"
                >
                  Verify Pass
                </button>
              </div>

              {/* 1-Click Quick Test Pass Tokens */}
              <div className="p-4 rounded-2xl glass-l1 border border-white/60 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                  <span className="font-bold flex items-center gap-1.5 text-slate-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Quick Test Passes (Odisha & Andhra Pradesh Cases):
                  </span>
                  <span>1-Click Test Pass Simulation</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setManualCode(samplePass1);
                      handleProcessCode(samplePass1);
                    }}
                    className="p-2.5 rounded-xl glass-l1 hover:bg-white/60 border border-white/60 text-left transition group shadow-xs cursor-pointer"
                  >
                    <div className="font-bold text-slate-900 text-[11px] group-hover:text-[#007AFF] flex items-center justify-between">
                      <span>Pravat Nayak</span>
                      <span className="text-[10px] text-rose-700 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-400/40 font-bold">
                        P1 PREG
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                      Talachua • 5 Members (1 Infant, 2 Cattle)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setManualCode(samplePass2);
                      handleProcessCode(samplePass2);
                    }}
                    className="p-2.5 rounded-xl glass-l1 hover:bg-white/60 border border-white/60 text-left transition group shadow-xs cursor-pointer"
                  >
                    <div className="font-bold text-slate-900 text-[11px] group-hover:text-[#007AFF] flex items-center justify-between">
                      <span>Bishnu Das</span>
                      <span className="text-[10px] text-rose-700 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-400/40 font-bold">
                        P1 BED
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                      Batighar • 6 Members (1 Bedridden, 4 Cattle)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setManualCode(samplePass3);
                      handleProcessCode(samplePass3);
                    }}
                    className="p-2.5 rounded-xl glass-l1 hover:bg-white/60 border border-white/60 text-left transition group shadow-xs cursor-pointer"
                  >
                    <div className="font-bold text-slate-900 text-[11px] group-hover:text-[#007AFF] flex items-center justify-between">
                      <span>K. Appala Naidu</span>
                      <span className="text-[10px] text-amber-800 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-400/40 font-bold">
                        P2 INF
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                      Bheemili AP • 4 Members (1 Infant)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setManualCode(samplePass4);
                      handleProcessCode(samplePass4);
                    }}
                    className="p-2.5 rounded-xl glass-l1 hover:bg-white/60 border border-white/60 text-left transition group shadow-xs cursor-pointer"
                  >
                    <div className="font-bold text-slate-900 text-[11px] group-hover:text-[#007AFF] flex items-center justify-between">
                      <span>M. Subba Rao</span>
                      <span className="text-[10px] text-rose-700 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-400/40 font-bold">
                        P1 CHRONIC
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                      Perupalem AP • 3 Members (Insulin-dependent)
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COMPREHENSIVE HOUSEHOLD INTAKE DOSSIER CARD */}
          {scannedResult && (
            <div
              id="intake-dossier-card"
              className="p-6 sm:p-7 rounded-[38px] glass-l2 border border-emerald-400/60 space-y-5 shadow-2xl relative overflow-hidden"
            >
              {/* Decorative Accent Glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/40 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl glass-l3 text-emerald-600 border border-white/60 flex items-center justify-center shadow-xs">
                    <CheckCircle className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-950 tracking-tight">
                      {t.passVerified}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Official Evacuee Intake Dossier & Gate Muster
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold glass-l1 text-emerald-900 border border-emerald-400/60">
                    PASS #{scannedResult.shortRef.toUpperCase()}
                  </span>
                  {isAdmitted ? (
                    isDuplicateScan ? (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold glass-l1 bg-amber-500/25 text-amber-950 border border-amber-500/60 flex items-center gap-1.5 shadow-xs">
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                        ALREADY ADMITTED (RE-ADDITION BLOCKED)
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold glass-l1 bg-emerald-500/20 text-emerald-900 border border-emerald-400/60 flex items-center gap-1.5 shadow-xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ADMITTED & STOCKS UPGRADED
                      </span>
                    )
                  ) : (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold glass-l1 bg-amber-500/20 text-amber-900 border border-amber-400/60">
                      PENDING GATE ENTRY
                    </span>
                  )}
                </div>
              </div>

              {/* Shelter Destination Match Verification */}
              {scannedResult.shelterId === selectedShelterId ? (
                <div className="p-3.5 rounded-2xl glass-l1 bg-emerald-500/15 border border-emerald-400/50 text-emerald-900 text-xs flex items-center justify-between relative z-10 font-medium">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Official Designated Shelter Verified:{" "}
                    <strong className="text-slate-950">{currentShelter?.name}</strong>
                  </span>
                  <span className="text-[10px] font-mono glass-l1 px-2.5 py-0.5 rounded-full border border-emerald-400/60 font-bold">
                    MATCH CONFIRMED
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl glass-l1 bg-amber-500/15 border border-amber-400/50 text-amber-900 text-xs flex items-center justify-between relative z-10 font-medium">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Originally Designated For Shelter:{" "}
                    <strong className="text-slate-950">{scannedResult.shelterId}</strong>
                  </span>
                  <span className="text-[10px] font-bold glass-l1 px-2.5 py-0.5 rounded-full border border-amber-400/60">
                    DIVERTED EVACUEE
                  </span>
                </div>
              )}

              {/* DUPLICATE SCAN HIGH-VISIBILITY ALERT BANNER */}
              {isDuplicateScan && duplicateNotice && (
                <div className="p-5 rounded-2xl glass-l1 bg-amber-500/15 border-2 border-amber-500/70 text-amber-950 shadow-xl space-y-3 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-amber-500/30">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-700 shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-amber-950 tracking-tight flex items-center gap-2">
                          <span>DUPLICATE SCAN DETECTED • ALREADY ADMITTED</span>
                          <span className="text-[10px] font-mono font-bold bg-amber-500/30 text-amber-900 px-2 py-0.5 rounded-full border border-amber-500/40">
                            SCAN #{duplicateNotice.scanCount || 2}
                          </span>
                        </h4>
                        <p className="text-[11px] text-amber-900/90 font-medium">
                          This QR Pass was already checked into safe shelter. Re-addition into shelter headcount was actively blocked to safeguard against capacity miscalculation.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono font-bold uppercase text-amber-800/80 block">
                        Initial Gate Entry
                      </span>
                      <span className="text-xs font-mono font-black text-amber-950">
                        {formatTimestamp(duplicateNotice.firstAdmittedAt, detectedTimeZone, true)}
                      </span>
                    </div>
                  </div>

                  {/* Protection Metrics Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-amber-500/30 shadow-inner">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Shelter Headcount
                      </span>
                      <span className="text-sm font-black text-emerald-800 flex items-center gap-1 mt-0.5">
                        <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>+{duplicateNotice.preventedMembers} Blocked (No Overcount)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Shelter capacity preserved
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-amber-500/30 shadow-inner">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Ration Deductions
                      </span>
                      <span className="text-sm font-black text-blue-800 flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>0 New Deductions</span>
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Water ({duplicateNotice.preventedWater}L) & Food ({duplicateNotice.preventedFood} pkts) protected
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-amber-500/30 shadow-inner">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Designated Shelter
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate block mt-0.5">
                        {duplicateNotice.shelterName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                        Token: #{scannedResult.shortRef.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 1: HOUSEHOLD IDENTITY, ORIGIN & ACCURATE VERIFICATION TIMESTAMPS */}
              <div className="p-5 rounded-[28px] glass-l1 border border-white/60 space-y-4 relative z-10 text-slate-800">
                <div className="flex items-center justify-between pb-2.5 border-b border-white/40">
                  <div className="text-xs uppercase font-extrabold text-[#007AFF] tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#007AFF]" />
                    <span>Household Identification & Origin</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-900 glass-l1 px-2.5 py-0.5 rounded-full border border-emerald-400/60 font-bold">
                    VERIFIED DOSSIER
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">
                      Head of Household:
                    </span>
                    <span className="text-base font-black text-slate-950">
                      {scannedResult.headName}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">
                      Hamlet / Village of Origin:
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {scannedResult.hamletName}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">
                      Ward / Gram Panchayat:
                    </span>
                    <span className="text-slate-800 font-medium">
                      Ward {matchedHousehold?.ward_number || 1} •{" "}
                      {currentShelter?.gram_panchayat || "Coastal Sector"}
                    </span>
                  </div>
                </div>

                {/* AUTHORITATIVE ARRIVAL TIME & DURATION AUDIT (EXACT SPEC MATCH) */}
                {(() => {
                  const qrCreatedAt =
                    scannedResult?.createdAt ||
                    scanAuditRecord?.qr_created_at ||
                    matchedHousehold?.registered_at ||
                    Date.now();
                  const qrScannedAt =
                    scanAuditRecord?.qr_scanned_at ||
                    scannedAtTimestamp ||
                    Date.now();
                  const durationSeconds =
                    scanAuditRecord?.arrival_duration_seconds != null
                      ? scanAuditRecord.arrival_duration_seconds
                      : Math.max(0, Math.floor((qrScannedAt - qrCreatedAt) / 1000));
                  const isDuplicate = scanAuditRecord?.duplicate || false;

                  return (
                    <div className="space-y-3 pt-3.5 border-t border-white/40">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            <span>Official Shelter Arrival Time Record</span>
                          </span>
                          <span className="text-[10px] font-mono text-[#007AFF] glass-l1 px-2.5 py-0.5 rounded-full border border-sky-300/60 font-bold">
                            {detectedTimeZone} ({timeZoneShort})
                          </span>
                        </div>
                        {isDuplicateScan ? (
                          <span className="text-[10px] font-mono font-bold glass-l1 bg-amber-500/25 text-amber-950 px-2.5 py-0.5 rounded-full border border-amber-500/60 flex items-center gap-1 shadow-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            RE-SCANNED (Scan #{scanAuditRecord?.scan_count || duplicateNotice?.scanCount || 2}) • RE-ENTRY PREVENTED
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold glass-l1 bg-emerald-500/20 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-400/60">
                            FIRST ARRIVAL VERIFIED
                          </span>
                        )}
                      </div>

                      {/* 2-Column Timestamps: QR Created At & QR Scanned At */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* QR Created At */}
                        <div className="p-4 rounded-2xl glass-l1 border border-white/60 shadow-inner">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between">
                            <span>QR Created At</span>
                            <span className="text-[10px] font-mono text-[#007AFF] font-bold">PASS TIMESTAMP</span>
                          </div>
                          <div className="text-xl font-mono font-black text-slate-950 mt-1">
                            {formatClockTime(qrCreatedAt, detectedTimeZone)}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between font-medium">
                            <span>{formatTimestamp(qrCreatedAt, detectedTimeZone, true)}</span>
                            <span className="text-[#007AFF] font-mono text-[9px] glass-l1 px-2 py-0.5 rounded-full border border-sky-300/60 font-bold">
                              LOCAL TIME
                            </span>
                          </div>
                        </div>

                        {/* QR Scanned At */}
                        <div className="p-4 rounded-2xl glass-l1 border border-white/60 shadow-inner">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between">
                            <span>{isDuplicateScan ? "Initial Gate Check-In" : "QR Scanned At"}</span>
                            <span
                              className={cn(
                                "text-[10px] font-mono font-bold",
                                isDuplicateScan ? "text-amber-800" : "text-emerald-700"
                              )}
                            >
                              {isDuplicateScan ? "FIRST ENTRY" : "GATE SCAN"}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "text-xl font-mono font-black mt-1",
                              isDuplicateScan ? "text-amber-950" : "text-emerald-700"
                            )}
                          >
                            {formatClockTime(
                              duplicateNotice?.firstAdmittedAt || qrScannedAt,
                              detectedTimeZone
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between font-medium">
                            <span>
                              {formatTimestamp(
                                duplicateNotice?.firstAdmittedAt || qrScannedAt,
                                detectedTimeZone,
                                true
                              )}
                            </span>
                            <span
                              className={cn(
                                "font-mono text-[9px] glass-l1 px-2 py-0.5 rounded-full border font-bold",
                                isDuplicateScan
                                  ? "text-amber-800 border-amber-400/60"
                                  : "text-emerald-700 border-emerald-400/60"
                              )}
                            >
                              {isDuplicateScan ? "ORIGINAL ENTRY" : "LOCAL TIME"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Time Taken to Reach Shelter */}
                      <div className="p-4 rounded-2xl glass-l1 bg-emerald-500/15 border border-emerald-400/50 flex flex-wrap items-center justify-between gap-3 shadow-inner">
                        <div>
                          <div className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                            Time Taken to Reach Shelter
                          </div>
                          <div className="text-3xl font-mono font-black text-emerald-900 mt-1">
                            {formatDuration(durationSeconds)}
                          </div>
                          <div className="text-[10px] text-slate-600 mt-1 font-medium">
                            Calculated: QR Scan Time ({formatClockTime(qrScannedAt, detectedTimeZone)}) − QR Creation Time ({formatClockTime(qrCreatedAt, detectedTimeZone)}) • {detectedTimeZone}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-mono text-slate-600 uppercase font-semibold">
                            Timer State
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-black text-amber-900 glass-l1 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-400/60 shadow-inner">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            TIMER FROZEN AT SCAN
                          </span>
                        </div>
                      </div>

                      {/* STATUS */}
                      <div className="p-3.5 rounded-2xl glass-l1 border border-white/60 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            STATUS
                          </div>
                          <div className="text-base font-black text-emerald-700 flex items-center gap-2 mt-0.5">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            <span>✓ Reached Shelter</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-slate-500 block font-semibold">
                            Shelter Gate Muster
                          </span>
                          <span className="text-xs font-mono font-black text-slate-900">
                            #{scannedResult.shortRef.toUpperCase()} • {currentShelter?.name || "Official Shelter"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* SECTION 2: DEMOGRAPHIC BREAKDOWN (WHO ARE ENTERING) */}
              <div className="p-5 rounded-[28px] glass-l1 border border-white/60 space-y-3.5 relative z-10 text-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase font-extrabold text-[#007AFF] tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#007AFF]" />
                    <span>Calculated Family Demographic Breakdown</span>
                  </div>
                  <span className="text-xs font-bold text-[#007AFF] glass-l1 px-3 py-1 rounded-full border border-sky-300/60">
                    {isDuplicateScan
                      ? `Protected: ${scannedResult.totalMembers} Headcount Already Counted`
                      : `+${scannedResult.totalMembers} Headcount Entering Shelter`}
                  </span>
                </div>

                {/* Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="p-3 rounded-2xl glass-l1 border border-white/60 text-center shadow-inner">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">
                      Total Members
                    </div>
                    <div className="text-lg font-black text-[#007AFF] mt-0.5 font-mono">
                      {scannedResult.totalMembers}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl glass-l1 border border-white/60 text-center shadow-inner">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">
                      Adult Males
                    </div>
                    <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
                      {scannedResult.maleCount}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl glass-l1 border border-white/60 text-center shadow-inner">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">
                      Adult Females
                    </div>
                    <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
                      {scannedResult.femaleCount}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl glass-l1 border border-white/60 text-center shadow-inner">
                    <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                      <Baby className="w-3 h-3 text-pink-500" />
                      <span>Infants &lt;5y</span>
                    </div>
                    <div
                      className={cn(
                        "text-lg font-black mt-0.5 font-mono",
                        scannedResult.infantCount > 0 ? "text-pink-600" : "text-slate-400"
                      )}
                    >
                      {scannedResult.infantCount}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl glass-l1 border border-white/60 text-center shadow-inner">
                    <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                      <HeartPulse className="w-3 h-3 text-amber-500" />
                      <span>Elderly &gt;60y</span>
                    </div>
                    <div
                      className={cn(
                        "text-lg font-black mt-0.5 font-mono",
                        scannedResult.elderlyCount > 0 ? "text-amber-600" : "text-slate-400"
                      )}
                    >
                      {scannedResult.elderlyCount}
                    </div>
                  </div>
                </div>

                {/* Livestock Info */}
                <div className="flex items-center justify-between p-3 rounded-2xl glass-l1 border border-white/60 text-xs font-medium">
                  <span className="text-slate-600 flex items-center gap-1.5 font-bold">
                    <span>Domestic Livestock & Cattle:</span>
                  </span>
                  <span className="font-bold text-emerald-800">
                    {scannedResult.livestockCount > 0
                      ? `${scannedResult.livestockCount} Cattle / Goats (Shelter Pen Required)`
                      : "No Livestock Registered"}
                  </span>
                </div>
              </div>

              {/* SECTION 3: SPECIAL MEDICAL TRIAGE & CLINICAL NOTES */}
              <div className="p-5 rounded-[28px] glass-l1 border border-white/60 space-y-3.5 relative z-10 text-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase font-extrabold text-rose-600 tracking-wider flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-500" />
                    <span>Special Medical Vulnerability & Triage Assessment</span>
                  </div>

                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-mono font-bold glass-l1 border",
                      scannedResult.triageCode.startsWith("P1")
                        ? "bg-rose-500/20 text-rose-900 border-rose-400/60"
                        : scannedResult.triageCode.startsWith("P2")
                        ? "bg-amber-500/20 text-amber-900 border-amber-400/60"
                        : "bg-sky-500/20 text-sky-900 border-sky-400/60"
                    )}
                  >
                    TRIAGE: {scannedResult.triageCode}
                  </span>
                </div>

                {/* Clinical Notes Box */}
                <div className="p-4 rounded-2xl glass-l1 border border-white/60 space-y-2 text-xs text-slate-800 shadow-inner">
                  <div className="flex justify-between items-center text-slate-500 text-[11px] font-semibold">
                    <span className="text-slate-900 font-bold">
                      Intake Clinical Assessment Notes:
                    </span>
                    <span className="font-mono text-[10px]">
                      Logged by Medical Intake Officer
                    </span>
                  </div>

                  <p className="text-slate-800 leading-relaxed font-medium">
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

                  <div className="pt-2.5 border-t border-white/40 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                    <span>
                      Recommended Bay:{" "}
                      <strong className="text-emerald-800 font-bold">
                        {scannedResult.triageCode.startsWith("P1")
                          ? "Ground Floor Maternity / Special Care Wing A"
                          : "General Refugee Dormitory Hall 2"}
                      </strong>
                    </span>
                    <span>
                      Priority Level:{" "}
                      <strong
                        className={
                          scannedResult.triageCode.startsWith("P1")
                            ? "text-rose-700 font-bold"
                            : "text-[#007AFF] font-bold"
                        }
                      >
                        {scannedResult.triageCode.startsWith("P1")
                          ? "P1 Immediate Care"
                          : "Standard Priority"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: IMMEDIATE RELIEF ENTITLEMENT CALCULATOR */}
              <div className="p-5 rounded-[28px] glass-l1 border border-white/60 space-y-3.5 relative z-10 text-slate-800">
                <div className="text-xs uppercase font-extrabold text-amber-700 tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>
                    {isDuplicateScan
                      ? "Gatekeeper Relief Ration Quota (Allocated at Initial Check-In)"
                      : "Calculated Gatekeeper Relief Ration Quota"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-2xl glass-l1 border border-white/60 shadow-inner">
                    <span className="text-[10px] text-slate-500 block font-bold">
                      Drinking Water Quota:
                    </span>
                    <span className="text-sm font-black text-[#007AFF]">
                      {scannedResult.totalMembers * 3} Litres / Day
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      3L per person standard
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl glass-l1 border border-white/60 shadow-inner">
                    <span className="text-[10px] text-slate-500 block font-bold">
                      Dry Food Rations:
                    </span>
                    <span className="text-sm font-black text-amber-800">
                      {scannedResult.totalMembers * 2} Packets
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Chuda, gur & biscuits
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl glass-l1 border border-white/60 shadow-inner">
                    <span className="text-[10px] text-slate-500 block font-bold">
                      ORS Sachets & Halogen:
                    </span>
                    <span className="text-sm font-black text-emerald-800">
                      {scannedResult.totalMembers * 2} Units
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Electrolyte & water tabs
                    </span>
                  </div>

                  {scannedResult.infantCount > 0 && (
                    <div className="p-3 rounded-2xl glass-l1 bg-pink-500/10 border border-pink-400/40">
                      <span className="text-[10px] text-pink-700 block font-bold">
                        Infant Baby Formula:
                      </span>
                      <span className="text-sm font-black text-pink-900">
                        {scannedResult.infantCount} Tin / Pack
                      </span>
                      <span className="text-[10px] text-pink-600 block">
                        For infant &lt;5y
                      </span>
                    </div>
                  )}

                  {scannedResult.femaleCount > 0 && (
                    <div className="p-3 rounded-2xl glass-l1 bg-purple-500/10 border border-purple-400/40">
                      <span className="text-[10px] text-purple-700 block font-bold">
                        Sanitary & Dignity Kits:
                      </span>
                      <span className="text-sm font-black text-purple-900">
                        {scannedResult.femaleCount} Kits
                      </span>
                      <span className="text-[10px] text-purple-600 block">
                        Adult female evacuees
                      </span>
                    </div>
                  )}

                  {scannedResult.livestockCount > 0 && (
                    <div className="p-3 rounded-2xl glass-l1 bg-emerald-500/10 border border-emerald-400/40">
                      <span className="text-[10px] text-emerald-700 block font-bold">
                        Cattle Fodder Tokens:
                      </span>
                      <span className="text-sm font-black text-emerald-900">
                        {scannedResult.livestockCount} Feed Bundles
                      </span>
                      <span className="text-[10px] text-emerald-600 block">
                        Pen & dry straw allocation
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 5: AUTOMATIC SHELTER STOCKS UPGRADE & ACTION */}
              <div className="pt-2 space-y-3 relative z-10">
                {isAdmitted ? (
                  isDuplicateScan ? (
                    <div className="p-5 rounded-[28px] glass-l1 bg-amber-500/15 border-2 border-amber-500/60 shadow-xl space-y-3.5 text-amber-950">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-black text-sm text-amber-950">
                          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                          <span>Idempotency Lock Active • Safe Shelter Capacity Preserved</span>
                        </span>
                        <span className="text-[11px] font-mono text-amber-900 glass-l1 px-2.5 py-0.5 rounded-full border border-amber-500/60 font-bold bg-amber-500/20">
                          DUPLICATE PREVENTED
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-amber-500/40 text-xs space-y-1.5 shadow-inner">
                        <div className="flex items-center gap-1.5 font-bold text-amber-950">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Miscalculation Safeguard: Zero New Deductions or Headcount Additions</span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          This household was already officially admitted into safe shelter during the initial gate scan. To eliminate double-counting risks, shelter muster headcount was <strong>not incremented (+0 Pax)</strong>, and food & water rations were <strong>not re-deducted</strong>.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-0.5 text-xs">
                        <div className="p-3 rounded-2xl glass-l1 border border-white/60">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Shelter Muster Occupancy
                          </span>
                          <span className="text-sm font-black text-emerald-700 font-mono mt-0.5 block">
                            Preserved (+0 Pax)
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Active: {currentShelter?.current_occupancy} / {currentShelter?.capacity_persons}
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl glass-l1 border border-white/60">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Water Inventory
                          </span>
                          <span className="text-sm font-black text-blue-700 font-mono mt-0.5 block">
                            Protected (-0 L)
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Allocated at first check-in
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl glass-l1 border border-white/60 col-span-2 sm:col-span-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Food Rations
                          </span>
                          <span className="text-sm font-black text-amber-800 font-mono mt-0.5 block">
                            Protected (-0 Pkts)
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Allocated at first check-in
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 text-[11px] text-slate-700 border-t border-white/40 font-medium">
                        <span>
                          Admitted Shelter: <strong className="text-slate-950">{duplicateNotice?.shelterName || currentShelter?.name}</strong> • Gate Entry:{" "}
                          <strong className="text-slate-950 font-mono">
                            {formatTimestamp(
                              existingAdmission?.admitted_at || duplicateNotice?.firstAdmittedAt || Date.now(),
                              detectedTimeZone,
                              true
                            )}
                          </strong>
                        </span>

                        {existingAdmission && (
                          <button
                            type="button"
                            onClick={() => handleUndoAdmission(existingAdmission.id)}
                            className="text-[11px] text-rose-700 hover:text-rose-900 underline font-bold transition cursor-pointer"
                          >
                            Revert / Restore Stocks
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-[28px] glass-l1 bg-emerald-500/15 border border-emerald-400/60 shadow-xl space-y-3 text-emerald-950">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-black text-sm text-emerald-950">
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span>Pass Verified • Shelter Stocks Automatically Upgraded!</span>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-900 glass-l1 px-2.5 py-0.5 rounded-full border border-emerald-400/60 font-bold">
                          LIVE SYNCED
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                        <div className="p-3 rounded-2xl glass-l1 border border-white/60">
                          <span className="text-[10px] uppercase font-bold text-slate-600 block">
                            Muster Occupancy
                          </span>
                          <span className="text-base font-black text-slate-950 font-mono">
                            +{scannedResult.totalMembers} Pax
                          </span>
                          <span className="text-[10px] text-slate-600 block mt-0.5">
                            Now {currentShelter?.current_occupancy} / {currentShelter?.capacity_persons}
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl glass-l1 border border-white/60">
                          <span className="text-[10px] uppercase font-bold text-slate-600 block">
                            Water Deducted & Burn
                          </span>
                          <span className="text-base font-black text-[#007AFF] font-mono">
                            -{scannedResult.totalMembers * 3} L
                          </span>
                          <span className="text-[10px] text-slate-600 block mt-0.5">
                            Burn: {(currentShelter?.current_occupancy || 0) * 3} L/day
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl glass-l1 border border-white/60 col-span-2 sm:col-span-1">
                          <span className="text-[10px] uppercase font-bold text-slate-600 block">
                            Food Dispatched & Burn
                          </span>
                          <span className="text-base font-black text-amber-800 font-mono">
                            -{scannedResult.totalMembers * 2} Pkts
                          </span>
                          <span className="text-[10px] text-slate-600 block mt-0.5">
                            Burn: {(currentShelter?.current_occupancy || 0) * 2} pkts/day
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 text-[11px] text-slate-700 border-t border-white/40 font-medium">
                        <span>
                          Shelter: <strong className="text-slate-950">{currentShelter?.name}</strong> • Gate Entry:{" "}
                          <strong className="text-slate-950 font-mono">
                            {existingAdmission
                              ? formatTimestamp(
                                existingAdmission.admitted_at,
                                detectedTimeZone
                              )
                              : formatTimestamp(
                                scannedAtTimestamp || Date.now(),
                                detectedTimeZone
                              )}
                          </strong>
                        </span>

                        {existingAdmission && (
                          <button
                            type="button"
                            onClick={() => handleUndoAdmission(existingAdmission.id)}
                            className="text-[11px] text-rose-700 hover:text-rose-900 underline font-bold transition cursor-pointer"
                          >
                            Revert / Restore Stocks
                          </button>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmAdmission}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 group cursor-pointer active:scale-95"
                  >
                    <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition" />
                    <span>
                      Upgrade Shelter Stocks Now (+{scannedResult.totalMembers} Headcount)
                    </span>
                  </button>
                )}

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (openWindow) {
                        openWindow("/inventory");
                      } else {
                        window.location.href = "/inventory";
                      }
                    }}
                    className="py-2.5 px-4 rounded-2xl glass-l1 hover:bg-white/60 text-[#007AFF] font-bold text-xs transition border border-white/60 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>View in Shelter Stocks →</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleScanNext}
                    className="flex-1 py-2.5 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs transition border border-blue-400 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4 text-white" />
                    <span>Scan Next Evacuee Pass</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("muster")}
                    className="px-4 py-2.5 rounded-2xl glass-l1 hover:bg-white/60 text-slate-800 font-bold text-xs transition border border-white/60 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Who Entered ({admissions.length})</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* MUSTER ROLL VIEW: WHO ENTERED THE SHELTER */
        <div className="p-6 sm:p-7 rounded-[38px] glass-l2 border border-white/60 shadow-lg space-y-5 relative">
          <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#007AFF]" />
                <span>Shelter Gate Muster Roll</span>
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Official list of evacuees admitted into {currentShelter?.name}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("scanner")}
              className="px-4 py-2 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Back to Scanner</span>
            </button>
          </div>

          {/* Admission Summary Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
            <div className="p-3.5 rounded-2xl glass-l1 border border-white/60 shadow-inner">
              <span className="text-[10px] text-slate-500 uppercase font-bold">
                Total Entered
              </span>
              <div className="text-lg font-black text-[#007AFF] mt-0.5 font-mono">
                {totalShiftEvacuees} Persons
              </div>
              <span className="text-[10px] text-slate-500">
                {totalShiftHouseholds} Households
              </span>
            </div>

            <div className="p-3.5 rounded-2xl glass-l1 border border-white/60 shadow-inner">
              <span className="text-[10px] text-slate-500 uppercase font-bold">
                Infants Entered
              </span>
              <div className="text-lg font-black text-pink-600 mt-0.5 font-mono">
                {totalShiftInfants} Infants
              </div>
              <span className="text-[10px] text-slate-500">Under 5 years</span>
            </div>

            <div className="p-3.5 rounded-2xl glass-l1 border border-white/60 shadow-inner">
              <span className="text-[10px] text-slate-500 uppercase font-bold">
                Elderly Entered
              </span>
              <div className="text-lg font-black text-amber-700 mt-0.5 font-mono">
                {totalShiftElderly} Senior Citizens
              </div>
              <span className="text-[10px] text-slate-500">Over 60 years</span>
            </div>

            <div className="p-3.5 rounded-2xl glass-l1 border border-white/60 shadow-inner">
              <span className="text-[10px] text-slate-500 uppercase font-bold">
                Critical Triage (P1)
              </span>
              <div className="text-lg font-black text-rose-600 mt-0.5 font-mono">
                {totalShiftCritical} Cases
              </div>
              <span className="text-[10px] text-slate-500">
                Maternity / Bedridden
              </span>
            </div>
          </div>

          {/* Search Muster Input */}
          <div className="relative z-10">
            <input
              type="text"
              value={searchMuster}
              onChange={(e) => setSearchMuster(e.target.value)}
              placeholder="Search by Head of Household, Hamlet, or Pass Token..."
              className="w-full glass-input rounded-2xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 font-semibold focus:outline-none"
            />
          </div>

          {/* Muster Roster Table */}
          {filteredAdmissions.length === 0 ? (
            <div className="p-8 rounded-2xl glass-l1 text-center space-y-2 border border-white/60 relative z-10">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-700">
                {searchMuster
                  ? "No matching admitted evacuees found."
                  : "No admissions recorded for this shelter yet."}
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Scan household QR passes or use sample test passes to log
                evacuee entries into this shelter.
              </p>
            </div>
          ) : (
            <div className="space-y-3 relative z-10">
              {filteredAdmissions.map((adm) => (
                <div
                  key={adm.id}
                  className="p-4 rounded-2xl glass-l1 border border-white/60 hover:bg-white/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-900 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-950 text-xs">
                        {adm.head_name}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-900 glass-l1 px-2 py-0.5 rounded-full border border-emerald-400/60 font-bold">
                        #{adm.household_token.toUpperCase()}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded-full glass-l1 border",
                          adm.triage_level === "P1_CRITICAL"
                            ? "bg-rose-500/15 text-rose-800 border-rose-400/50"
                            : adm.triage_level === "P2_URGENT"
                            ? "bg-amber-500/15 text-amber-800 border-amber-400/50"
                            : "bg-sky-500/15 text-sky-800 border-sky-400/50"
                        )}
                      >
                        {adm.triage_code}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        Origin: {adm.hamlet_name} (Ward {adm.ward_number || 1})
                      </span>
                      <span>•</span>
                      <span className="text-[#007AFF] font-bold">
                        {adm.total_members} Members ({adm.male_count}M •{" "}
                        {adm.female_count}F • {adm.child_under_five_count} Inf •{" "}
                        {adm.elderly_above_sixty_count} Eld)
                      </span>
                      {adm.livestock_count > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">
                            {adm.livestock_count} Livestock
                          </span>
                        </>
                      )}
                    </div>

                    {adm.clinical_notes && (
                      <div className="text-[10px] text-slate-500 italic">
                        Notes: {adm.clinical_notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="text-right text-[10px] text-emerald-800 font-mono glass-l1 px-3 py-1.5 rounded-xl border border-white/60 space-y-0.5">
                      <div className="flex items-center gap-1 justify-end font-bold">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>{formatClockTime(adm.qr_scanned_at || adm.admitted_at, detectedTimeZone)}</span>
                      </div>
                      {adm.arrival_duration_seconds != null && (
                        <div className="text-[9px] text-[#007AFF] font-bold">
                          Transit: {formatDuration(adm.arrival_duration_seconds)}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUndoAdmission(adm.id)}
                      className="p-2 rounded-xl glass-l1 hover:bg-rose-500/20 text-rose-700 border border-rose-300/50 transition text-xs cursor-pointer shadow-xs"
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
