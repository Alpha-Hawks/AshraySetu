"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Printer,
  QrCode,
  CheckCircle2,
  Download,
  Volume2,
  VolumeX,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PrintedPassData {
  passId: string;
  householdId: string;
  headName: string;
  hamletName: string;
  wardNumber: number;
  shelterName: string;
  shelterDistrict: string;
  totalMembers: number;
  maleCount: number;
  femaleCount: number;
  infantCount: number;
  elderlyCount: number;
  livestockCount: number;
  vulnerability: string;
  createdAt: number;
  qrPayload: string;
  qrUrl: string;
}

export interface IntakePrinterModalProps {
  passData: PrintedPassData;
  onClose: () => void;
}

export type POSPrinterPhase =
  | "pos-processing"     // 0.00s - 0.65s: POS receiving registration, "PROCESSING..."
  | "pos-verifying"      // 0.65s - 1.35s: "VERIFYING •", "• •", "• • •", slot sensor
  | "pos-generating"     // 1.35s - 2.05s: "GENERATING PASS...", subtle chassis micro-activity
  | "pos-approved"       // 2.05s - 2.45s: "APPROVED ✓", brief green authorization state
  | "printer-engage"     // 2.45s - 2.75s: 0.3s mechanical pause, motor primes
  | "feed-step-1"        // 2.75s - 3.20s: paper emerges down to ~75px
  | "strike-1"           // 3.20s - 3.42s: STRIKE 1! Roller catches, 3px upward recoil shudder, pause 220ms
  | "feed-step-2"        // 3.42s - 4.05s: releases, feeds down to ~260px (evacuee details)
  | "strike-2"           // 4.05s - 4.27s: STRIKE 2! Roller catches, 3px upward recoil shudder, pause 220ms
  | "feed-step-3"        // 4.27s - 4.90s: releases, feeds down to ~430px (square QR prints)
  | "strike-3"           // 4.90s - 5.10s: STRIKE 3! Roller catches, 2px upward recoil shudder, pause 200ms
  | "feed-final"         // 5.10s - 5.60s: releases, final feed to full length, irregular torn cutter edge appears
  | "completed";         // 5.60s+: "PASS READY", stationary pass, confirmation chime, single Download button

export function IntakePrinterModal({ passData, onClose }: IntakePrinterModalProps) {
  // Realistic Payment Terminal & Physical Printer Phase State
  const [phase, setPhase] = useState<POSPrinterPhase>("pos-processing");
  const [verifyingDots, setVerifyingDots] = useState("•");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  const paperContentRef = useRef<HTMLDivElement>(null);
  const [paperHeight, setPaperHeight] = useState<number>(0);

  const stepperIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Dynamically measure the full natural height of the receipt paper
  useEffect(() => {
    const measure = () => {
      if (paperContentRef.current) {
        const h = paperContentRef.current.offsetHeight || paperContentRef.current.scrollHeight;
        if (h > 0) {
          setPaperHeight(h);
        }
      }
    };
    measure();
    const t1 = setTimeout(measure, 60);
    const t2 = setTimeout(measure, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [passData]);

  // Clean Mode: Remove Header and Navbar while QR pass is generating/printing
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.classList.add("qr-modal-open");
      document.documentElement.setAttribute("data-qr-generating", "true");
      window.dispatchEvent(
        new CustomEvent("qrGeneratingState", { detail: { isGenerating: true } })
      );
    }

    return () => {
      if (typeof window !== "undefined") {
        document.body.classList.remove("qr-modal-open");
        document.documentElement.removeAttribute("data-qr-generating");
        window.dispatchEvent(
          new CustomEvent("qrGeneratingState", { detail: { isGenerating: false } })
        );
      }
    };
  }, []);

  // MANDATORY SECURITY: Prevent user from reloading or using browser back button to close generated pass
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Please download your Official Emergency QR Token Pass before leaving.";
      return e.returnValue;
    };

    // Trap back button using history pushState
    window.history.pushState({ modalLocked: true }, "");
    const handlePopState = () => {
      window.history.pushState({ modalLocked: true }, "");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setIsReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, []);

  // Web Audio Synthesizer for POS Electronic Chimes, Motors & Stepper Ticks
  const playAudioEffect = useCallback(
    (type: "step" | "chime" | "pos-key" | "pos-auth" | "motor-prime" | "strike") => {
      if (!soundEnabled || typeof window === "undefined") return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        if (type === "pos-key") {
          // Soft POS terminal electronic pulse
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, now);
          gain.gain.setValueAtTime(0.03, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
        } else if (type === "pos-auth") {
          // Crisp terminal transaction authorization dual chime
          [
            { freq: 659.25, time: 0, dur: 0.12 }, // E5
            { freq: 880.00, time: 0.11, dur: 0.18 }, // A5
          ].forEach(({ freq, time, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + time);
            gain.gain.setValueAtTime(0.06, now + time);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + time);
            osc.stop(now + time + dur);
          });
        } else if (type === "motor-prime") {
          // Thermal printer stepper engagement click
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(110, now);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.09);
        } else if (type === "strike") {
          // Sharp mechanical roller strike / paper friction catch
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.05);
          gain.gain.setValueAtTime(0.055, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
        } else if (type === "step") {
          // Soft mechanical micro-tick of thermal stepper
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(35, now + 0.035);
          gain.gain.setValueAtTime(0.03, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.035);
        } else if (type === "chime") {
          // Apple-style confirmation dual chime
          [
            { freq: 523.25, time: 0, dur: 0.25 }, // C5
            { freq: 659.25, time: 0.12, dur: 0.35 }, // E5
          ].forEach(({ freq, time, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + time);
            gain.gain.setValueAtTime(0.08, now + time);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + time);
            osc.stop(now + time + dur);
          });
        }
      } catch {
        // Audio unavailable or blocked
      }
    },
    [soundEnabled]
  );

  // REALISTIC PAYMENT TERMINAL SEQUENCE WITH 3 DISTINCT PAPER STRIKES WHILE FALLING DOWN
  // Timeline:
  // 0.00 - 0.65s: POS PROCESSING...
  // 0.65 - 1.35s: VERIFYING... (subtle dots: • -> • • -> • • •)
  // 1.35 - 2.05s: GENERATING PASS... (chassis micro-activity)
  // 2.05 - 2.45s: APPROVED ✓ (brief green approval state)
  // 2.45 - 2.75s: ENGAGING PRINTER... (0.3s mechanical pause, motor primes)
  // 2.75 - 3.20s: FEED STEP 1: Paper emerges down from slot to ~75px
  // 3.20 - 3.42s: STRIKE 1! Downward movement suddenly catches, 3px upward recoil, pause 220ms
  // 3.42 - 4.05s: FEED STEP 2: Releases! Feeds down briskly to ~260px (evacuee details)
  // 4.05 - 4.27s: STRIKE 2! Downward movement catches a 2nd time, 3px upward recoil, pause 220ms
  // 4.27 - 4.90s: FEED STEP 3: Releases! Feeds down to ~430px (square QR code prints)
  // 4.90 - 5.10s: STRIKE 3! Downward movement catches a 3rd time, 2px upward recoil, pause 200ms
  // 5.10 - 5.60s: FINAL FEED: Releases! Down to full length, irregular serrated cutter edge appears
  // 5.60s+: PASS READY, stationary pass, confirmation chime, single Download button
  useEffect(() => {
    if (isReducedMotion) {
      setPhase("completed");
      playAudioEffect("chime");
      return;
    }

    // 0.00s: Initial POS processing
    playAudioEffect("pos-key");

    // 0.65s: VERIFYING
    const tVerifying = setTimeout(() => {
      setPhase("pos-verifying");
      playAudioEffect("pos-key");
    }, 650);
    animationTimersRef.current.push(tVerifying);

    const tDot1 = setTimeout(() => setVerifyingDots("• •"), 900);
    const tDot2 = setTimeout(() => setVerifyingDots("• • •"), 1150);
    animationTimersRef.current.push(tDot1, tDot2);

    // 1.35s: GENERATING PASS
    const tGenerating = setTimeout(() => {
      setPhase("pos-generating");
      playAudioEffect("pos-key");
    }, 1350);
    animationTimersRef.current.push(tGenerating);

    // 2.05s: APPROVED ✓
    const tApproved = setTimeout(() => {
      setPhase("pos-approved");
      playAudioEffect("pos-auth");
    }, 2050);
    animationTimersRef.current.push(tApproved);

    // 2.45s: Motor priming
    const tEngage = setTimeout(() => {
      setPhase("printer-engage");
      playAudioEffect("motor-prime");
    }, 2450);
    animationTimersRef.current.push(tEngage);

    // 2.75s: FEED STEP 1 (down to ~75px)
    const tFeed1 = setTimeout(() => {
      setPhase("feed-step-1");
      playAudioEffect("step");
    }, 2750);
    animationTimersRef.current.push(tFeed1);

    // 3.20s: STRIKE 1! (paper abruptly catches/stutters with 3px upward recoil)
    const tStrike1 = setTimeout(() => {
      setPhase("strike-1");
      playAudioEffect("strike");
    }, 3200);
    animationTimersRef.current.push(tStrike1);

    // 3.42s: FEED STEP 2 (releases and feeds down to ~260px)
    const tFeed2 = setTimeout(() => {
      setPhase("feed-step-2");
      if (soundEnabled) {
        let count = 0;
        stepperIntervalRef.current = setInterval(() => {
          if (count < 5) {
            playAudioEffect("step");
            count++;
          } else {
            if (stepperIntervalRef.current) clearInterval(stepperIntervalRef.current);
          }
        }, 110);
      }
    }, 3420);
    animationTimersRef.current.push(tFeed2);

    // 4.05s: STRIKE 2! (paper catches a 2nd time with 3px upward recoil)
    const tStrike2 = setTimeout(() => {
      if (stepperIntervalRef.current) clearInterval(stepperIntervalRef.current);
      setPhase("strike-2");
      playAudioEffect("strike");
    }, 4050);
    animationTimersRef.current.push(tStrike2);

    // 4.27s: FEED STEP 3 (releases and feeds down to ~430px, QR prints)
    const tFeed3 = setTimeout(() => {
      setPhase("feed-step-3");
      if (soundEnabled) {
        let count = 0;
        stepperIntervalRef.current = setInterval(() => {
          if (count < 5) {
            playAudioEffect("step");
            count++;
          } else {
            if (stepperIntervalRef.current) clearInterval(stepperIntervalRef.current);
          }
        }, 110);
      }
    }, 4270);
    animationTimersRef.current.push(tFeed3);

    // 4.90s: STRIKE 3! (paper catches a 3rd time with 2px upward recoil)
    const tStrike3 = setTimeout(() => {
      if (stepperIntervalRef.current) clearInterval(stepperIntervalRef.current);
      setPhase("strike-3");
      playAudioEffect("strike");
    }, 4900);
    animationTimersRef.current.push(tStrike3);

    // 5.10s: FINAL FEED (releases, feeds to full length, irregular torn cutter edge appears)
    const tFinalFeed = setTimeout(() => {
      setPhase("feed-final");
      playAudioEffect("step");
    }, 5100);
    animationTimersRef.current.push(tFinalFeed);

    // 5.60s: Fully completed, chime sounds, pass completely still and attached
    const tComplete = setTimeout(() => {
      setPhase("completed");
      if (stepperIntervalRef.current) {
        clearInterval(stepperIntervalRef.current);
        stepperIntervalRef.current = null;
      }
      playAudioEffect("chime");
    }, 5600);
    animationTimersRef.current.push(tComplete);

    return () => {
      animationTimersRef.current.forEach((t) => clearTimeout(t));
      if (stepperIntervalRef.current) clearInterval(stepperIntervalRef.current);
    };
  }, [isReducedMotion, playAudioEffect, soundEnabled]);

  // Format Pass Timestamp
  const formatTimestamp = (ts: number): string => {
    try {
      const d = new Date(ts);
      const day = String(d.getDate()).padStart(2, "0");
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const seconds = String(d.getSeconds()).padStart(2, "0");
      return `${day} ${month} ${year} • ${hours}:${minutes}:${seconds} IST`;
    } catch {
      return "04 OCT 2026 • 19:12:00 IST";
    }
  };

  // Handle download and automatically close modal
  const handleDownloadAndClose = () => {
    if (isDownloaded) return;
    setIsDownloaded(true);
    try {
      const link = document.createElement("a");
      link.href = passData.qrUrl;
      link.download = `AshraySetu_Pass_${passData.passId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // fallback
    }

    // Automatically close modal after download
    setTimeout(() => {
      onClose();
    }, 550);
  };

  const isPosProcessing =
    phase === "pos-processing" ||
    phase === "pos-verifying" ||
    phase === "pos-generating";

  const isQrRevealed =
    phase === "feed-step-3" ||
    phase === "strike-3" ||
    phase === "feed-final" ||
    phase === "completed";

  // Calculate dynamic physical height & mechanical recoil values for the 3 paper strikes
  const fullTargetHeight = paperHeight > 0 ? paperHeight : 660;

  const getFeedValues = () => {
    switch (phase) {
      case "pos-processing":
      case "pos-verifying":
      case "pos-generating":
      case "pos-approved":
      case "printer-engage":
        return { h: 0, y: 0, duration: 0.1, ease: "linear" };

      case "feed-step-1":
        // Paper starts falling down from slot to 75px
        return { h: 75, y: 0, duration: 0.45, ease: "easeOut" };

      case "strike-1":
        // STRIKE 1: Abrupt catch, 3px upward recoil shudder
        return { h: 72, y: -3, duration: 0.11, ease: "easeInOut" };

      case "feed-step-2":
        // Release & feed down briskly to 260px
        return { h: 260, y: 0, duration: 0.63, ease: [0.16, 1, 0.3, 1] };

      case "strike-2":
        // STRIKE 2: Abrupt catch, 3px upward recoil shudder
        return { h: 257, y: -3, duration: 0.11, ease: "easeInOut" };

      case "feed-step-3":
        // Release & feed down past larger QR to 490px
        return { h: 490, y: 0, duration: 0.65, ease: [0.16, 1, 0.3, 1] };

      case "strike-3":
        // STRIKE 3: Abrupt catch near bottom, 2px upward recoil shudder
        return { h: 487, y: -2, duration: 0.1, ease: "easeInOut" };

      case "feed-final":
        // Final feed to full length, irregular torn cutter edge appears
        return { h: fullTargetHeight, y: 0, duration: 0.5, ease: "easeOut" };

      case "completed":
        // Locked at full height, 100% still and stationary
        return { h: fullTargetHeight, y: 0, duration: 0.15, ease: "easeOut" };
    }
  };

  const feedState = getFeedValues();

  return (
    <div className="fixed inset-0 z-[100000] bg-[#0c0d10] overflow-y-auto p-3 sm:p-4 flex flex-col items-center justify-start pt-4 sm:pt-6 pb-20 animate-in fade-in duration-200">
      {/* Anchor container: strictly top-positioned, machine never moves */}
      <div className="relative w-full max-w-lg flex flex-col items-center select-none pt-1">
        {/* Top Control Bar: Audio Mute ONLY (Close X completely removed) */}
        <div className="w-full max-w-[340px] sm:max-w-[380px] flex items-center justify-between px-2 mb-3 z-40">
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white glass-l1 border border-white/20 transition cursor-pointer"
            title={soundEnabled ? "Mute Terminal Audio" : "Enable Terminal Audio"}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Audio On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span>Muted</span>
              </>
            )}
          </button>

          {/* POS Terminal Encrypted Channel Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>SECURE POS GATEWAY</span>
          </div>
        </div>

        {/* ========================================================
            1. THE POS / SWIPE MACHINE — COMPLETELY FIXED AT TOP
            (Stationary physical anchor throughout entire sequence)
            ======================================================== */}
        <div className="relative z-30 w-full max-w-[340px] sm:max-w-[380px] pointer-events-auto">
          <div className="relative rounded-[26px] bg-gradient-to-b from-[#23272e] via-[#16181d] to-[#0c0d10] p-4 sm:p-5 border border-white/[0.12] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_1px_0_rgba(255,255,255,0.12)_inset]">
            <div className="absolute inset-0 rounded-[26px] pointer-events-none ring-1 ring-white/10" />

            {/* Top Row: Dynamic POS Terminal Status & Brand */}
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center w-3 h-3">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors duration-300",
                      phase === "completed" || phase === "pos-approved"
                        ? "bg-emerald-400 shadow-[0_0_10px_#34d399]"
                        : "bg-amber-400 shadow-[0_0_10px_#fbbf24]"
                    )}
                  />
                  {phase !== "completed" && phase !== "pos-approved" && (
                    <span className="absolute w-2 h-2 rounded-full bg-amber-400 animate-ping opacity-75" />
                  )}
                </div>

                <span className="text-[11px] font-mono font-semibold tracking-wider text-slate-300 uppercase">
                  {phase === "pos-processing" && "PROCESSING..."}
                  {phase === "pos-verifying" && `VERIFYING ${verifyingDots}`}
                  {phase === "pos-generating" && "GENERATING PASS..."}
                  {phase === "pos-approved" && "APPROVED ✓"}
                  {phase === "printer-engage" && "ENGAGING PRINTER..."}
                  {phase === "feed-step-1" && "PRINTING..."}
                  {phase === "strike-1" && "FEEDING (STRIKE 1/3)"}
                  {phase === "feed-step-2" && "PRINTING PASS DETAILS..."}
                  {phase === "strike-2" && "FEEDING (STRIKE 2/3)"}
                  {phase === "feed-step-3" && "PRINTING SQUARE QR..."}
                  {phase === "strike-3" && "FEEDING (STRIKE 3/3)"}
                  {phase === "feed-final" && "FINALIZING PASS..."}
                  {phase === "completed" && "TOKEN PASS READY"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-slate-400">
                <span className="font-bold text-slate-200">ASHRAYSETU</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">POS-01</span>
              </div>
            </div>

            {/* Recessed POS LCD Information Display */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/55 border border-white/[0.08] mb-3.5 transition-colors duration-300">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <Printer className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-slate-300 font-semibold truncate max-w-[170px]">
                  {passData.shelterName}
                </span>
              </div>

              <div className="text-[10px] font-mono shrink-0">
                {phase === "pos-processing" && (
                  <span className="text-amber-400 font-bold animate-pulse">PROCESSING</span>
                )}
                {phase === "pos-verifying" && (
                  <span className="text-amber-400 font-bold animate-pulse">VERIFYING</span>
                )}
                {phase === "pos-generating" && (
                  <span className="text-sky-400 font-bold animate-pulse">GENERATING</span>
                )}
                {phase === "pos-approved" && (
                  <span className="text-emerald-400 font-bold">APPROVED ✓</span>
                )}
                {phase === "printer-engage" && (
                  <span className="text-amber-300 font-bold">ENGAGING</span>
                )}
                {phase === "feed-step-1" && (
                  <span className="text-amber-400 font-bold animate-pulse">FEEDING</span>
                )}
                {phase === "strike-1" && (
                  <span className="text-amber-300 font-bold">STRIKE 1</span>
                )}
                {phase === "feed-step-2" && (
                  <span className="text-amber-400 font-bold animate-pulse">PRINTING</span>
                )}
                {phase === "strike-2" && (
                  <span className="text-amber-300 font-bold">STRIKE 2</span>
                )}
                {phase === "feed-step-3" && (
                  <span className="text-sky-400 font-bold animate-pulse">PRINTING QR</span>
                )}
                {phase === "strike-3" && (
                  <span className="text-amber-300 font-bold">STRIKE 3</span>
                )}
                {phase === "feed-final" && (
                  <span className="text-amber-400 font-bold animate-pulse">CUTTING</span>
                )}
                {phase === "completed" && (
                  <span className="text-emerald-400 font-bold">100% OK</span>
                )}
              </div>
            </div>

            {/* Precision-Milled Paper Exit Slot with subtle scanner sensor */}
            <div className="relative w-full h-[12px] rounded-full bg-[#050608] border border-black/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.95)] flex items-center justify-center overflow-hidden">
              <div className="w-[88%] h-[2.5px] bg-[#000000] rounded-sm border-b border-white/[0.14] relative">
                {/* Subtle scanner laser gliding across during POS processing */}
                {isPosProcessing && (
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                    className="absolute top-0 bottom-0 w-12 bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent blur-[1px]"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            2. THE THERMAL RECEIPT PAPER (FALLING DOWN WITH 3 STRIKES)
            (Emerged straight down from slot; 3 mechanical roller catches;
             Anchored at slot at all times; No ocean wave; Flat & still)
            ======================================================== */}
        <div className="relative -mt-2 z-20 flex flex-col items-center w-full">
          <motion.div
            style={{
              overflow: phase === "completed" ? "visible" : "hidden",
              transformOrigin: "top center",
            }}
            animate={{
              height: phase === "completed" ? "auto" : feedState.h,
              y: feedState.y,
            }}
            transition={{
              height: {
                duration: isReducedMotion ? 0 : feedState.duration,
                ease: feedState.ease as any,
              },
              y: {
                duration: isReducedMotion ? 0 : feedState.duration,
                ease: "easeInOut",
              },
            }}
            className="w-[290px] sm:w-[330px] relative"
          >
            {/* THE PHYSICAL PRINTED THERMAL PAPER RECEIPT (Pure White, No Background/Shadow) */}
            <div
              ref={paperContentRef}
              className="w-full bg-white text-slate-900 p-4 sm:p-5 pb-0 flex flex-col items-center relative select-none"
            >
              {/* 1. Pass / Header Branding */}
              <div className="w-full border-b border-dashed border-slate-300 mb-3 pb-1 flex justify-between text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                <span>OFFICIAL MUSTER PASS</span>
                <span>TEAR HERE</span>
              </div>

              <div className="text-center space-y-0.5 mb-2.5">
                <h2 className="text-base sm:text-lg font-black tracking-widest text-slate-950 font-mono uppercase">
                  ASHRAYSETU
                </h2>
                <div className="text-[11px] font-extrabold tracking-wider text-rose-600 uppercase font-mono">
                  EMERGENCY TOKEN PASS
                </div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  SHELTER ACCESS PASS
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-slate-200 mb-2.5" />

              {/* 2 & 3. Registration Status & Evacuee Details */}
              <div className="w-full text-left space-y-1.5 mb-2.5 text-xs font-mono">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">PASS ID</span>
                  <span className="font-extrabold text-slate-950 tracking-wider">
                    {passData.passId}
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">NAME</span>
                  <span className="text-[11px] font-bold text-slate-900 truncate max-w-[170px]">
                    {passData.headName}
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">HOUSEHOLD ID</span>
                  <span className="text-[10px] font-semibold text-slate-600 font-mono truncate max-w-[160px]">
                    {passData.householdId.substring(0, 13)}...
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">MEMBERS</span>
                  <span className="text-[11px] font-black text-slate-950">
                    {passData.totalMembers} Pax ({passData.maleCount}M, {passData.femaleCount}F
                    {passData.infantCount > 0 ? `, ${passData.infantCount}Inf` : ""}
                    {passData.elderlyCount > 0 ? `, ${passData.elderlyCount}Eld` : ""})
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">LOCATION</span>
                  <span className="text-[10px] font-bold text-[#007AFF] truncate max-w-[170px]">
                    {passData.shelterName} • {passData.hamletName}
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">CREATED</span>
                  <span className="text-[10px] font-semibold text-slate-800">
                    {formatTimestamp(passData.createdAt)}
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">TRIAGE</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      passData.vulnerability !== "Standard Evacuee"
                        ? "bg-rose-100 text-rose-800"
                        : "text-slate-700"
                    )}
                  >
                    {passData.vulnerability}
                  </span>
                </div>
              </div>

              {/* 4. Perforation Divider */}
              <div className="w-full my-2 border-t border-dashed border-slate-300" />

              {/* 5. REAL GENERATED SCANNABLE SQUARE QR CODE (Increased size, no circle) */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs mb-2 flex flex-col items-center justify-center select-none overflow-hidden w-full max-w-[250px] sm:max-w-[280px]">
                <motion.div
                  initial={{ clipPath: "inset(0 0 100% 0)" }}
                  animate={{
                    clipPath: isQrRevealed ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)",
                  }}
                  transition={{ duration: 0.32, ease: "linear" }}
                  className="relative aspect-square w-full flex items-center justify-center"
                >
                  {passData.qrUrl ? (
                    <img
                      src={passData.qrUrl}
                      alt="Official Emergency Evacuation Square QR Pass"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain aspect-square select-none"
                      style={{ imageRendering: "pixelated" }}
                    />
                  ) : (
                    <div className="w-48 h-48 sm:w-56 sm:h-56 bg-slate-100 rounded-lg animate-pulse flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                </motion.div>
                <div className="text-[9.5px] font-mono font-bold text-slate-500 mt-1.5 uppercase tracking-wider">
                  OFFICIAL SQUARE QR • SCANNABLE
                </div>
              </div>

              {/* 6. Emergency Pass Security & Verification Information */}
              <div className="w-full py-1 px-2.5 rounded-lg bg-sky-50 border border-sky-200/90 flex items-center justify-between text-[10px] font-mono font-bold text-sky-900 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Download className="w-3 h-3 text-sky-600 animate-bounce" />
                  <span>OFFICIAL DIGITAL PASS</span>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-sky-700 bg-white px-1.5 py-0.5 rounded border border-sky-200 font-extrabold shadow-2xs">
                  READY
                </span>
              </div>

              <div className="text-center space-y-0.5 mb-1">
                <div className="text-[10px] font-bold text-slate-800 uppercase tracking-wider font-mono">
                  OFFICIAL ADMISSION TOKEN
                </div>
                <div className="text-[8.5px] font-mono text-slate-400">
                  ODISHA & ANDHRA PRADESH DISASTER MANAGEMENT
                </div>
              </div>

              {/* ========================================================
                  7. PHYSICAL SAWTOOTH CUTTER TEAR EDGE
                  (Sharp, uniform triangular serrated teeth matching POS terminal)
                  ======================================================== */}
              <div className="w-full relative select-none leading-none -mt-px overflow-visible" aria-hidden="true">
                <svg
                  viewBox="0 0 330 9"
                  className="w-full h-2.5 sm:h-3 block text-white fill-white"
                  preserveAspectRatio="none"
                >
                  <polygon
                    points="0,0 0,1 5.5,8 11.0,1 16.5,8 22.0,1 27.5,8 33.0,1 38.5,8 44.0,1 49.5,8 55.0,1 60.5,8 66.0,1 71.5,8 77.0,1 82.5,8 88.0,1 93.5,8 99.0,1 104.5,8 110.0,1 115.5,8 121.0,1 126.5,8 132.0,1 137.5,8 143.0,1 148.5,8 154.0,1 159.5,8 165.0,1 170.5,8 176.0,1 181.5,8 187.0,1 192.5,8 198.0,1 203.5,8 209.0,1 214.5,8 220.0,1 225.5,8 231.0,1 236.5,8 242.0,1 247.5,8 253.0,1 258.5,8 264.0,1 269.5,8 275.0,1 280.5,8 286.0,1 291.5,8 297.0,1 302.5,8 308.0,1 313.5,8 319.0,1 324.5,8 330,1 330,0"
                  />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ========================================================
            3. CONFIRMATION BADGE
            ======================================================== */}
        <AnimatePresence>
          {phase === "completed" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="mt-6 flex flex-col items-center text-center space-y-2 w-full max-w-[340px] sm:max-w-[380px] z-30"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-mono font-bold shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                <span>PASS GENERATED ✓</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================
            4. SOLE ACTION CONTROL: DOWNLOAD PASS
            (Done button and tap indicator removed; auto-closes on download)
            ======================================================== */}
        {phase === "completed" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="mt-4 mb-10 flex items-center justify-center w-full max-w-[340px] sm:max-w-[380px] px-2 z-30"
          >
            {/* Prominent Full-Width Download Pass Button */}
            <button
              type="button"
              onClick={handleDownloadAndClose}
              disabled={isDownloaded}
              className={cn(
                "relative group overflow-hidden w-full py-3 px-5 rounded-2xl text-white text-sm font-bold transition flex items-center justify-center gap-2.5 shadow-xl active:scale-98 cursor-pointer",
                isDownloaded
                  ? "bg-emerald-600 shadow-emerald-500/30"
                  : "bg-gradient-to-r from-[#007AFF] via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-blue-600 ring-2 ring-sky-400/70 shadow-[0_0_30px_rgba(0,122,255,0.6)]"
              )}
            >
              {/* Sweeping Animated Sheen */}
              {!isDownloaded && (
                <motion.div
                  animate={{ x: ["-120%", "220%"] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "linear", repeatDelay: 0.5 }}
                  className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
                />
              )}

              {isDownloaded ? (
                <>
                  <Check className="w-5 h-5 text-emerald-100 stroke-[3]" />
                  <span className="text-sm font-extrabold tracking-wide">Downloaded! Closing...</span>
                </>
              ) : (
                <>
                  {/* Pulsing Beacon Dot */}
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                  <Download className="w-4 h-4 text-white animate-bounce shrink-0" />
                  <span className="font-extrabold tracking-wide text-sm">Download Pass</span>
                  <span className="text-[10px] font-mono uppercase bg-white/20 px-2 py-0.5 rounded-full text-white font-extrabold ml-1">
                    SAVE PASS
                  </span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
