"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldAlert,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Radio,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/admin/dashboard";

  const [username, setUsername] = useState<string>("admin");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutCountdown, setLockoutCountdown] = useState<number | null>(null);

  // If already logged in, redirect directly to dashboard
  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => {
        if (r.ok) {
          router.replace(redirectTarget);
        }
      })
      .catch(() => {});
  }, [redirectTarget, router]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutCountdown === null || lockoutCountdown <= 0) return;
    const t = setInterval(() => {
      setLockoutCountdown((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(t);
  }, [lockoutCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutCountdown) return;

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Pass and receive HttpOnly cookies
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setLockoutCountdown(data.remainingSeconds || 300);
          setErrorMessage(
            data.message || "Too many failed attempts. Temporary security lockout active."
          );
        } else {
          setErrorMessage(data.message || "Invalid administrator credentials.");
        }
        setIsLoading(false);
        return;
      }

      // Login successful!
      // Session cookie is set as HTTP-Only by the server.
      // Redirect to real-time Admin Command Center
      router.push(redirectTarget);
    } catch (err: any) {
      setErrorMessage(
        "Network connection error while reaching disaster command server."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 text-white shadow-xl shadow-rose-950/40 mb-3 border border-rose-400/30">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400 mb-2">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>STATE EMERGENCY OPERATIONS COMMAND</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Admin Command Login
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Authorized portal for disaster coordinators to monitor real-time evacuees,
            active QR scanners, and shelter arrivals.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Subtle top indicator bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />

          {/* Error / Lockout Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Authentication Error</span>
                <span>{errorMessage}</span>
                {lockoutCountdown && (
                  <span className="block mt-1 font-mono text-[11px] text-amber-400">
                    Lockout remaining: {Math.floor(lockoutCountdown / 60)}m{" "}
                    {lockoutCountdown % 60}s
                  </span>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Administrator Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition font-mono"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Security Passcode
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Initial Passcode: 9989
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter security passcode..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition font-mono"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition"
                  title={showPassword ? "Hide Passcode" : "Show Passcode"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || Boolean(lockoutCountdown)}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold text-sm shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Access Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice Footer */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Protected by server-side scrypt cryptographic authentication.
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                HTTP-Only session management with automated brute-force lockout.
              </span>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-4">
          <a
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            ← Back to Public Disaster Management Portal
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center text-slate-400 font-mono text-sm">
          Loading Secure Admin Portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
