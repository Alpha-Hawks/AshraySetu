"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Users,
  Camera,
  QrCode,
  CheckCircle2,
  Clock,
  Radio,
  LogOut,
  RefreshCw,
  Activity,
  ShieldCheck,
  EyeOff,
  AlertCircle,
  TrendingUp,
  MapPin,
  ExternalLink,
  ChevronRight,
  Filter,
  UserCheck,
  History,
  Info,
  Lock,
} from "lucide-react";

interface AdminUser {
  username: string;
  name: string;
  role: string;
  expiresAt: number;
}

interface LiveUserItem {
  id: string;
  currentPath: string;
  activity: string;
  status: "ONLINE" | "IDLE" | "OFFLINE";
  lastSeen: number;
  firstSeen: number;
  isScannerActive: boolean;
  deviceType: string;
}

interface ActiveScannerItem {
  stationId: string;
  sessionId: string;
  status: string;
  currentPath: string;
  lastSeen: number;
  cameraMode: string;
  privacyMode: string;
}

interface QrActivityItem {
  short_ref: string;
  head_name: string;
  hamlet_name: string;
  shelter_id: string;
  total_members: number;
  qr_created_at: number;
  qr_scanned_at: number | null;
  scan_count: number;
  latest_scan_time: number | null;
  arrival_duration_seconds: number | null;
  arrival_duration_formatted: string;
  status: string;
}

interface ShelterArrivalItem {
  id: string;
  short_ref: string;
  head_name: string;
  hamlet_name: string;
  shelter_id: string;
  total_members: number;
  qr_created_at: number;
  qr_scanned_at: number;
  arrival_duration_seconds: number;
  arrival_duration_formatted: string;
  status: string;
  scan_count: number;
}

interface ActivityLogItem {
  id: string;
  timestamp: number;
  type: string;
  title: string;
  description: string;
  sessionId?: string;
  short_ref?: string;
  head_name?: string;
}

interface MetricsSummary {
  live_users: number;
  active_scanners: number;
  shelter_arrivals: number;
  shelter_households_count: number;
  average_arrival_seconds: number;
  average_arrival_formatted: string;
  total_qr_issued: number;
  timestamp: number;
}

function formatClockTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "Invalid Time";
  }
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}h ago`;
}

function formatDurationDisplay(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} sec`;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Authentication & Session State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Real-Time Telemetry Data
  const [summary, setSummary] = useState<MetricsSummary>({
    live_users: 0,
    active_scanners: 0,
    shelter_arrivals: 0,
    shelter_households_count: 0,
    average_arrival_seconds: 0,
    average_arrival_formatted: "00 min 00 sec",
    total_qr_issued: 0,
    timestamp: Date.now(),
  });
  const [liveUsers, setLiveUsers] = useState<LiveUserItem[]>([]);
  const [activeScanners, setActiveScanners] = useState<ActiveScannerItem[]>([]);
  const [qrActivity, setQrActivity] = useState<QrActivityItem[]>([]);
  const [shelterArrivals, setShelterArrivals] = useState<ShelterArrivalItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);

  // UI Navigation & Filter State
  const [activeTab, setActiveTab] = useState<
    "ALL" | "USERS" | "SCANNERS" | "SCANS" | "ARRIVALS" | "TIMES" | "LOGS"
  >("ALL");
  const [activityFilter, setActivityFilter] = useState<string>("ALL");
  const [isConnectedSse, setIsConnectedSse] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // 1. Authoritative Server-Side Auth Check
  useEffect(() => {
    fetch("/api/admin/me")
      .then(async (res) => {
        if (!res.ok) {
          router.replace("/admin/login?redirect=/admin/dashboard");
          return;
        }
        const data = await res.json();
        setAdminUser(data.user);
        setIsAuthChecking(false);
      })
      .catch(() => {
        router.replace("/admin/login?redirect=/admin/dashboard");
      });
  }, [router]);

  // 2. Fetch Full Snapshot via REST
  const fetchMetricsSnapshot = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/admin/metrics");
      if (res.status === 401) {
        router.replace("/admin/login?redirect=/admin/dashboard");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.summary) setSummary(data.summary);
        if (data.liveUsers) setLiveUsers(data.liveUsers);
        if (data.activeScanners) setActiveScanners(data.activeScanners);
        if (data.qrActivity) setQrActivity(data.qrActivity);
        if (data.shelterArrivals) setShelterArrivals(data.shelterArrivals);
        if (data.activityLog) setActivityLog(data.activityLog);
        setLastSyncTime(Date.now());
      }
    } catch (e) {
      console.warn("Metrics fetch error", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 3. Connect Real-Time Server-Sent Events (SSE) Stream
  useEffect(() => {
    if (isAuthChecking) return;

    fetchMetricsSnapshot();

    try {
      const sse = new EventSource("/api/admin/stream");
      eventSourceRef.current = sse;

      sse.onopen = () => {
        setIsConnectedSse(true);
      };

      sse.addEventListener("init", (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.summary) setSummary(data.summary);
          if (data.liveUsers) setLiveUsers(data.liveUsers);
          if (data.activeScanners) setActiveScanners(data.activeScanners);
          if (data.qrActivity) setQrActivity(data.qrActivity);
          if (data.shelterArrivals) setShelterArrivals(data.shelterArrivals);
          if (data.activityLog) setActivityLog(data.activityLog);
          setLastSyncTime(Date.now());
        } catch {}
      });

      sse.addEventListener("update", (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.summary) setSummary(data.summary);
          if (data.liveUsers) setLiveUsers(data.liveUsers);
          if (data.activeScanners) setActiveScanners(data.activeScanners);
          if (data.qrActivity) setQrActivity(data.qrActivity);
          if (data.shelterArrivals) setShelterArrivals(data.shelterArrivals);
          if (data.activityLog) setActivityLog(data.activityLog);
          setLastSyncTime(Date.now());
        } catch {}
      });

      sse.onerror = () => {
        setIsConnectedSse(false);
      };

      // Fallback polling interval every 12 seconds in case SSE disconnected
      const fallbackPoll = setInterval(() => {
        if (!eventSourceRef.current || eventSourceRef.current.readyState !== EventSource.OPEN) {
          fetchMetricsSnapshot();
        }
      }, 12000);

      return () => {
        clearInterval(fallbackPoll);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };
    } catch (e) {
      console.warn("SSE init error", e);
    }
  }, [isAuthChecking]);

  // 4. Logout Functionality
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {}
    router.replace("/admin/login");
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-mono text-slate-400">
          Authenticating Disaster Command Session...
        </p>
      </div>
    );
  }

  // Filtered activity events
  const filteredEvents = activityLog.filter((item) => {
    if (activityFilter === "ALL") return true;
    if (activityFilter === "ARRIVALS")
      return item.type === "SHELTER_ARRIVAL" || item.type === "QR_SCAN_SUCCESS";
    if (activityFilter === "SCANNERS")
      return (
        item.type === "QR_SCANNER_OPENED" || item.type === "QR_SCANNING_STARTED"
      );
    if (activityFilter === "USERS")
      return (
        item.type === "USER_ENTERED" ||
        item.type === "USER_LEFT" ||
        item.type === "USER_INACTIVE"
      );
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Command Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-rose-950/40 border border-rose-400/30 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Disaster Evacuation & Shelter Admin Command
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                EOC LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time monitoring of portal visitors, active gatekeeper scanners, and verified shelter check-ins.
            </p>
          </div>
        </div>

        {/* Status Pills & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Real-time SSE indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
              isConnectedSse
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                isConnectedSse ? "text-emerald-400 animate-pulse" : "text-amber-400"
              }`}
            />
            <span>
              {isConnectedSse ? "REAL-TIME SSE CONNECTED" : "POLLING TELEMETRY"}
            </span>
          </div>

          {/* Refresh Snapshot Button */}
          <button
            onClick={fetchMetricsSnapshot}
            disabled={isRefreshing}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition"
            title="Refresh Metrics Now"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-sky-400" : ""}`}
            />
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* 4 SUMMARY CARDS (Required by specification) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: LIVE USERS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Users
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono">
              {summary.live_users}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Active Now
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            {liveUsers.filter((u) => u.status === "ONLINE").length} online •{" "}
            {liveUsers.filter((u) => u.status === "IDLE").length} idle
          </p>
        </div>

        {/* Card 2: ACTIVE SCANNERS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Scanners
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono">
              {summary.active_scanners}
            </span>
            <span className="text-xs text-sky-400 font-mono">Stations Live</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Real-time gatekeeper camera viewports
          </p>
        </div>

        {/* Card 3: SHELTER ARRIVALS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Shelter Arrivals
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono">
              {summary.shelter_arrivals}
            </span>
            <span className="text-xs text-indigo-300 font-mono">Citizens Sheltered</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Across {summary.shelter_households_count} verified household intakes
          </p>
        </div>

        {/* Card 4: AVERAGE ARRIVAL TIME */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Average Arrival Time
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
              {summary.average_arrival_formatted || "08 min 42 sec"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Scanned At − Created At duration
          </p>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "ALL"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <span>All Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("USERS")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "USERS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Live Users ({liveUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("SCANNERS")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "SCANNERS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Active QR Scanners ({activeScanners.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("SCANS")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "SCANS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>QR Scans ({qrActivity.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ARRIVALS")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "ARRIVALS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Shelter Arrivals ({shelterArrivals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("TIMES")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "TIMES"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Evacuation Times</span>
        </button>

        <button
          onClick={() => setActiveTab("LOGS")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "LOGS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Activity Log ({activityLog.length})</span>
        </button>
      </div>

      {/* SECTION 1: LIVE USERS */}
      {(activeTab === "ALL" || activeTab === "USERS") && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Live Users</h2>
                <p className="text-xs text-slate-400">
                  Real-time active visitors across public evacuation portal and field stations
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              {summary.live_users} Sessions Active
            </span>
          </div>

          {liveUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
              No remote visitors currently connected. Heartbeat updates will appear here automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">Unique Session ID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Current Location</th>
                    <th className="py-2.5 px-3">Activity Status</th>
                    <th className="py-2.5 px-3">Device Type</th>
                    <th className="py-2.5 px-3">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {liveUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        {user.id}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.status === "ONLINE"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : user.status === "IDLE"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : "bg-slate-800 text-slate-500 border border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === "ONLINE"
                                ? "bg-emerald-400"
                                : user.status === "IDLE"
                                ? "bg-amber-400"
                                : "bg-slate-600"
                            }`}
                          />
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {user.currentPath}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300">
                        <span className="flex items-center gap-1.5">
                          {user.isScannerActive && (
                            <Camera className="w-3.5 h-3.5 text-sky-400 animate-pulse shrink-0" />
                          )}
                          <span>{user.activity}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-400 text-[11px]">
                        {user.deviceType}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {formatRelativeTime(user.lastSeen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: ACTIVE QR SCANNERS */}
      {(activeTab === "ALL" || activeTab === "SCANNERS") && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Active QR Scanners</h2>
                <p className="text-xs text-slate-400">
                  Gatekeeper check-in stations actively streaming camera feeds for intake
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
              {activeScanners.length} Live Stations
            </span>
          </div>

          {activeScanners.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
              No gatekeeper scanner stations currently active. When field personnel activate the camera in the scan tab, station telemetry will display in real time.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeScanners.map((st) => (
                <div
                  key={st.stationId}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {st.stationId}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Continuous Frame Mode
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Associated Session:</span>
                      <span className="font-mono text-slate-300">{st.sessionId.slice(0, 14)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Camera Mode:</span>
                      <span className="text-slate-300">{st.cameraMode}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Privacy Shield:</span>
                      <span className="text-emerald-400 font-medium">{st.privacyMode}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Last Telemetry:</span>
                      <span className="font-mono text-slate-300">{formatRelativeTime(st.lastSeen)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                      Client-side hardware W3C decode
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: QR ACTIVITY */}
      {(activeTab === "ALL" || activeTab === "SCANS") && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">QR Activity</h2>
                <p className="text-xs text-slate-400">
                  Comprehensive ledger of generated evacuation passes, scan counts, and shelter transit metrics
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
              {qrActivity.length} Passes Tracked
            </span>
          </div>

          {qrActivity.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
              No QR passes generated yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">QR ID</th>
                    <th className="py-2.5 px-3">Evacuee / Head</th>
                    <th className="py-2.5 px-3">Origin & Shelter</th>
                    <th className="py-2.5 px-3">QR Creation Time</th>
                    <th className="py-2.5 px-3">Scans</th>
                    <th className="py-2.5 px-3">Latest Scan Time</th>
                    <th className="py-2.5 px-3">Members</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {qrActivity.map((qr) => (
                    <tr key={qr.short_ref} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-bold text-sky-400">
                        {qr.short_ref}
                      </td>
                      <td className="py-3 px-3 font-sans font-semibold text-white">
                        {qr.head_name}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300">
                        <div>{qr.hamlet_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{qr.shelter_id}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {formatClockTime(qr.qr_created_at)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                          {qr.scan_count}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {formatClockTime(qr.latest_scan_time)}
                      </td>
                      <td className="py-3 px-3 text-white font-bold">
                        {qr.total_members}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            qr.status === "REACHED_SHELTER"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {qr.status === "REACHED_SHELTER" ? "✓ Reached Shelter" : "In Transit"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4 & 5: SHELTER ARRIVALS & INDIVIDUAL EVACUATION RECORD */}
      {(activeTab === "ALL" || activeTab === "ARRIVALS" || activeTab === "TIMES") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SECTION 4: SHELTER ARRIVALS LIST (2 Cols) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Shelter Arrivals</h2>
                  <p className="text-xs text-slate-400">
                    Officially admitted evacuee households verified at gatekeeper scanners
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {shelterArrivals.length} Confirmed Intakes
              </span>
            </div>

            {shelterArrivals.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                No shelter arrivals recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="py-2 px-3">Citizen Head</th>
                      <th className="py-2 px-3">Shelter ID</th>
                      <th className="py-2 px-3">People</th>
                      <th className="py-2 px-3">QR Scanned At</th>
                      <th className="py-2 px-3">Transit Duration</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {shelterArrivals.map((arr) => (
                      <tr key={arr.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 font-sans">
                          <div className="font-bold text-white">{arr.head_name}</div>
                          <div className="text-[10px] text-slate-400">{arr.hamlet_name} • Pass #{arr.short_ref}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-mono text-[10px]">
                          {arr.shelter_id}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          {arr.total_members}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {formatClockTime(arr.qr_scanned_at)}
                        </td>
                        <td className="py-3 px-3 text-amber-300 font-bold">
                          {arr.arrival_duration_formatted}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ✓ Reached Shelter
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 5: INDIVIDUAL EVACUATION RECORD CARD (Exactly matching prompt layout) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Evacuation Times</h2>
                  <p className="text-xs text-slate-400">
                    Latest Individual Evacuation Record
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Formula: Time Taken = QR Scanned At − QR Created At
              </p>
            </div>

            {/* Structured Card matching user specification:
                QR Created At: 04:00:00 PM
                QR Scanned At: 04:07:35 PM
                Time Taken: 07 min 35 sec
                Status: ✓ Reached Shelter
            */}
            {shelterArrivals.length > 0 ? (
              (() => {
                const latest = shelterArrivals[0];
                return (
                  <div className="bg-slate-950/80 border-2 border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <span className="text-xs font-mono text-slate-400">
                        Pass ID: <span className="text-white font-bold">{latest.short_ref}</span>
                      </span>
                      <span className="text-xs font-sans font-bold text-slate-200">
                        {latest.head_name}
                      </span>
                    </div>

                    <div className="space-y-3 font-mono">
                      <div>
                        <div className="text-[11px] font-sans font-medium text-slate-400">
                          QR Created At:
                        </div>
                        <div className="text-base font-bold text-slate-200">
                          {formatClockTime(latest.qr_created_at)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-sans font-medium text-slate-400">
                          QR Scanned At:
                        </div>
                        <div className="text-base font-bold text-slate-200">
                          {formatClockTime(latest.qr_scanned_at)}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80">
                        <div className="text-[11px] font-sans font-medium text-amber-400">
                          Time Taken:
                        </div>
                        <div className="text-xl font-black text-amber-300">
                          {latest.arrival_duration_formatted}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-sans font-medium text-slate-400">
                          Status:
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          ✓ Reached Shelter
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 font-sans">
                      Timer frozen permanently at verified gatekeeper scan timestamp.
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 text-center text-slate-500 text-xs">
                Waiting for first evacuation scan.
              </div>
            )}

            {/* Quick Analytics */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Fastest Arrival:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {shelterArrivals.length > 0
                    ? formatDurationDisplay(
                        Math.min(
                          ...shelterArrivals.map((a) => a.arrival_duration_seconds)
                        )
                      )
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Average Arrival:</span>
                <span className="font-mono text-amber-300 font-bold">
                  {summary.average_arrival_formatted}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Longest Journey:</span>
                <span className="font-mono text-rose-300 font-bold">
                  {shelterArrivals.length > 0
                    ? formatDurationDisplay(
                        Math.max(
                          ...shelterArrivals.map((a) => a.arrival_duration_seconds)
                        )
                      )
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: REAL-TIME ACTIVITY LOG */}
      {(activeTab === "ALL" || activeTab === "LOGS") && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Activity Log</h2>
                <p className="text-xs text-slate-400">
                  Live streaming operational feed of system and field events
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                onClick={() => setActivityFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activityFilter === "ALL"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setActivityFilter("ARRIVALS")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activityFilter === "ARRIVALS"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Arrivals
              </button>
              <button
                onClick={() => setActivityFilter("SCANNERS")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activityFilter === "SCANNERS"
                    ? "bg-slate-800 text-sky-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Scanners
              </button>
              <button
                onClick={() => setActivityFilter("USERS")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activityFilter === "USERS"
                    ? "bg-slate-800 text-purple-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Visitors
              </button>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
              No activity events found for the selected filter.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredEvents.map((evt) => {
                let badgeColor = "bg-slate-800 text-slate-300 border-slate-700";
                if (evt.type === "SHELTER_ARRIVAL")
                  badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
                if (evt.type === "QR_SCAN_SUCCESS")
                  badgeColor = "bg-sky-500/20 text-sky-300 border-sky-500/40";
                if (evt.type === "QR_SCANNER_OPENED")
                  badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
                if (evt.type === "USER_ENTERED")
                  badgeColor = "bg-purple-500/20 text-purple-300 border-purple-500/40";
                if (evt.type === "USER_LEFT" || evt.type === "USER_INACTIVE")
                  badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/40";

                return (
                  <div
                    key={evt.id}
                    className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeColor}`}
                        >
                          {evt.type.replace(/_/g, " ")}
                        </span>
                        <span className="font-bold text-white">{evt.title}</span>
                      </div>
                      <p className="text-slate-400 text-xs">{evt.description}</p>
                    </div>

                    <div className="text-right shrink-0 font-mono text-[11px] text-slate-500">
                      <div>{formatClockTime(evt.timestamp)}</div>
                      <div className="text-[10px]">{formatRelativeTime(evt.timestamp)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
