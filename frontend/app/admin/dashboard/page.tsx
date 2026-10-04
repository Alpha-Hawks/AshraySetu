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
      {/* Top Command Bar - Liquid Glass */}
      <div className="glass-header-panel rounded-[40px] p-6 sm:p-7 relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl glass-l3 text-rose-600 flex items-center justify-center shadow-xs shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                  Disaster Evacuation & Shelter Admin Command
                </h1>
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-mono glass-l1 text-rose-700 border border-rose-300/50 font-bold">
                  EOC LIVE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 font-medium">
                Real-time monitoring of portal visitors, active gatekeeper scanners, and verified shelter check-ins.
              </p>
            </div>
          </div>

          {/* Status Pills & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Real-time SSE indicator */}
            <div
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium border glass-l1 shadow-xs ${
                isConnectedSse
                  ? "text-emerald-800 border-emerald-300/70"
                  : "text-amber-800 border-amber-300/70"
              }`}
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  isConnectedSse ? "text-emerald-600 animate-pulse" : "text-amber-600"
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
              className="p-2 rounded-2xl glass-l1 border border-white/60 text-slate-700 hover:text-slate-950 transition active:scale-95 shadow-xs"
              title="Refresh Metrics Now"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#007AFF]" : "text-slate-700"}`}
              />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-2xl glass-l1 border border-rose-300/60 text-rose-700 hover:text-rose-900 text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 SUMMARY CARDS (Required by specification) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: LIVE USERS */}
        <div className="glass-l2 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 border border-white/60 shadow-lg relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Live Users
            </span>
            <div className="w-10 h-10 rounded-2xl glass-l3 text-emerald-600 flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-950 font-mono tracking-tight">
              {summary.live_users}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 font-semibold glass-l1 px-2 py-0.5 rounded-full border border-emerald-300/50">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              Active Now
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono font-medium">
            {liveUsers.filter((u) => u.status === "ONLINE").length} online •{" "}
            {liveUsers.filter((u) => u.status === "IDLE").length} idle
          </p>
        </div>

        {/* Card 2: ACTIVE SCANNERS */}
        <div className="glass-l2 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 border border-white/60 shadow-lg relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Active Scanners
            </span>
            <div className="w-10 h-10 rounded-2xl glass-l3 text-[#007AFF] flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-[#007AFF] font-mono tracking-tight">
              {summary.active_scanners}
            </span>
            <span className="text-xs text-[#007AFF] font-mono font-bold glass-l1 px-2 py-0.5 rounded-full border border-sky-300/50">Stations Live</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Real-time gatekeeper camera viewports
          </p>
        </div>

        {/* Card 3: SHELTER ARRIVALS */}
        <div className="glass-l2 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 border border-white/60 shadow-lg relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Shelter Arrivals
            </span>
            <div className="w-10 h-10 rounded-2xl glass-l3 text-indigo-600 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-indigo-700 font-mono tracking-tight">
              {summary.shelter_arrivals}
            </span>
            <span className="text-xs text-indigo-700 font-mono font-semibold glass-l1 px-2 py-0.5 rounded-full border border-indigo-300/50">Citizens Sheltered</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Across {summary.shelter_households_count} verified household intakes
          </p>
        </div>

        {/* Card 4: AVERAGE ARRIVAL TIME */}
        <div className="glass-l2 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 border border-white/60 shadow-lg relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Average Arrival Time
            </span>
            <div className="w-10 h-10 rounded-2xl glass-l3 text-amber-600 flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-700 font-mono tracking-tight">
              {summary.average_arrival_formatted || "08 min 42 sec"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Scanned At − Created At duration
          </p>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="glass-l1 rounded-full p-1.5 border border-white/50 shadow-inner flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "ALL"
              ? "glass-pill-tab-all-active text-white shadow-sm"
              : "text-slate-600 hover:text-slate-950"
          }`}
        >
          <span>All Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("USERS")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "USERS"
              ? "glass-pill-tab-all-active text-white shadow-sm"
              : "text-slate-600 hover:text-slate-950"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Live Users ({liveUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("SCANNERS")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "SCANNERS"
              ? "glass-pill-tab-all-active text-white shadow-sm"
              : "text-slate-600 hover:text-slate-950"
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Active QR Scanners ({activeScanners.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("SCANS")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "SCANS"
              ? "glass-pill-tab-all-active text-white shadow-sm"
              : "text-slate-600 hover:text-slate-950"
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>QR Scans ({qrActivity.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ARRIVALS")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "ARRIVALS"
              ? "glass-pill-tab-all-active text-white shadow-sm"
              : "text-slate-600 hover:text-slate-950"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Shelter Arrivals ({shelterArrivals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("TIMES")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "TIMES"
              ? "glass-pill-tab-all-active text-white shadow-sm"
              : "text-slate-600 hover:text-slate-950"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Evacuation Times</span>
        </button>

        <button
          onClick={() => setActiveTab("LOGS")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "LOGS"
              ? "glass-pill-tab-all-active text-white shadow-sm"
              : "text-slate-600 hover:text-slate-950"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Activity Log ({activityLog.length})</span>
        </button>
      </div>

      {/* SECTION 1: LIVE USERS */}
      {(activeTab === "ALL" || activeTab === "USERS") && (
        <div className="glass-l2 rounded-[32px] sm:rounded-[38px] p-6 border border-white/60 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl glass-l3 text-emerald-600 flex items-center justify-center shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">Live Users</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Real-time active visitors across public evacuation portal and field stations
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-800 glass-l1 px-3 py-1 rounded-full border border-emerald-300/60 font-semibold shadow-xs">
              {summary.live_users} Sessions Active
            </span>
          </div>

          {liveUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs glass-l1 rounded-2xl border border-white/60 font-medium">
              No remote visitors currently connected. Heartbeat updates will appear here automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/60 text-slate-500 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3 font-semibold">Unique Session ID</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Current Location</th>
                    <th className="py-2.5 px-3 font-semibold">Activity Status</th>
                    <th className="py-2.5 px-3 font-semibold">Device Type</th>
                    <th className="py-2.5 px-3 font-semibold">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 font-mono">
                  {liveUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-white/40 transition group"
                    >
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {user.id}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            user.status === "ONLINE"
                              ? "bg-emerald-100/80 text-emerald-800 border border-emerald-300/70"
                              : user.status === "IDLE"
                              ? "bg-amber-100/80 text-amber-800 border border-amber-300/70"
                              : "glass-l1 text-slate-600 border border-white/60"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === "ONLINE"
                                ? "bg-emerald-500"
                                : user.status === "IDLE"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">
                        <span className="glass-l1 px-2.5 py-0.5 rounded-lg text-slate-800 border border-white/60 font-semibold">
                          {user.currentPath}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-800 font-medium">
                        <span className="flex items-center gap-1.5">
                          {user.isScannerActive && (
                            <Camera className="w-3.5 h-3.5 text-[#007AFF] animate-pulse shrink-0" />
                          )}
                          <span>{user.activity}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-500 text-[11px]">
                        {user.deviceType}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
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
        <div className="glass-l2 rounded-[32px] sm:rounded-[38px] p-6 border border-white/60 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl glass-l3 text-[#007AFF] flex items-center justify-center shadow-xs">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">Active QR Scanners</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Gatekeeper check-in stations actively streaming camera feeds for intake
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#007AFF] glass-l1 px-3 py-1 rounded-full border border-sky-300/60 font-bold shadow-xs">
              {activeScanners.length} Live Stations
            </span>
          </div>

          {activeScanners.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs glass-l1 rounded-2xl border border-white/60 font-medium">
              No gatekeeper scanner stations currently active. When field personnel activate the camera in the scan tab, station telemetry will display in real time.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeScanners.map((st) => (
                <div
                  key={st.stationId}
                  className="p-5 rounded-2xl glass-l1 border border-white/60 hover:border-sky-300/80 transition space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold glass-l2 text-[#007AFF] border border-sky-300/60">
                      {st.stationId}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Continuous Frame Mode
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Associated Session:</span>
                      <span className="font-mono text-slate-900 font-semibold">{st.sessionId.slice(0, 14)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Camera Mode:</span>
                      <span className="text-slate-900 font-semibold">{st.cameraMode}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Privacy Shield:</span>
                      <span className="text-emerald-700 font-bold">{st.privacyMode}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Last Telemetry:</span>
                      <span className="font-mono text-slate-900 font-semibold">{formatRelativeTime(st.lastSeen)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#007AFF]" />
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
        <div className="glass-l2 rounded-[32px] sm:rounded-[38px] p-6 border border-white/60 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl glass-l3 text-purple-600 flex items-center justify-center shadow-xs">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">QR Activity</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Comprehensive ledger of generated evacuation passes, scan counts, and shelter transit metrics
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-purple-800 glass-l1 px-3 py-1 rounded-full border border-purple-300/60 font-semibold shadow-xs">
              {qrActivity.length} Passes Tracked
            </span>
          </div>

          {qrActivity.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs glass-l1 rounded-2xl border border-white/60 font-medium">
              No QR passes generated yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/60 text-slate-500 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3 font-semibold">QR ID</th>
                    <th className="py-2.5 px-3 font-semibold">Evacuee / Head</th>
                    <th className="py-2.5 px-3 font-semibold">Origin & Shelter</th>
                    <th className="py-2.5 px-3 font-semibold">QR Creation Time</th>
                    <th className="py-2.5 px-3 font-semibold">Scans</th>
                    <th className="py-2.5 px-3 font-semibold">Latest Scan Time</th>
                    <th className="py-2.5 px-3 font-semibold">Members</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 font-mono text-[11px]">
                  {qrActivity.map((qr) => (
                    <tr key={qr.short_ref} className="hover:bg-white/40 transition">
                      <td className="py-3 px-3 font-bold text-[#007AFF]">
                        {qr.short_ref}
                      </td>
                      <td className="py-3 px-3 font-sans font-bold text-slate-950">
                        {qr.head_name}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-700">
                        <div className="font-medium">{qr.hamlet_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{qr.shelter_id}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {formatClockTime(qr.qr_created_at)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="glass-l1 px-2.5 py-0.5 rounded-md text-slate-800 font-bold border border-white/60">
                          {qr.scan_count}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {formatClockTime(qr.latest_scan_time)}
                      </td>
                      <td className="py-3 px-3 text-slate-950 font-bold">
                        {qr.total_members}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold ${
                            qr.status === "REACHED_SHELTER"
                              ? "bg-emerald-100/80 text-emerald-800 border border-emerald-300/70"
                              : "bg-amber-100/80 text-amber-800 border border-amber-300/70"
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
          <div className="lg:col-span-2 glass-l2 rounded-[32px] sm:rounded-[38px] p-6 border border-white/60 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl glass-l3 text-emerald-600 flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-950">Shelter Arrivals</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Officially admitted evacuee households verified at gatekeeper scanners
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-800 glass-l1 px-3 py-1 rounded-full border border-emerald-300/60 font-semibold shadow-xs">
                {shelterArrivals.length} Confirmed Intakes
              </span>
            </div>

            {shelterArrivals.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs glass-l1 rounded-2xl border border-white/60 font-medium">
                No shelter arrivals recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-slate-500 font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-3 font-semibold">Citizen Head</th>
                      <th className="py-2.5 px-3 font-semibold">Shelter ID</th>
                      <th className="py-2.5 px-3 font-semibold">People</th>
                      <th className="py-2.5 px-3 font-semibold">QR Scanned At</th>
                      <th className="py-2.5 px-3 font-semibold">Transit Duration</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80 font-mono text-[11px]">
                    {shelterArrivals.map((arr) => (
                      <tr key={arr.id} className="hover:bg-white/40 transition">
                        <td className="py-3 px-3 font-sans">
                          <div className="font-bold text-slate-950">{arr.head_name}</div>
                          <div className="text-[10px] text-slate-500 font-medium">{arr.hamlet_name} • Pass #{arr.short_ref}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-mono text-[10px]">
                          {arr.shelter_id}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-950">
                          {arr.total_members}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {formatClockTime(arr.qr_scanned_at)}
                        </td>
                        <td className="py-3 px-3 text-amber-700 font-bold">
                          {arr.arrival_duration_formatted}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-300/70">
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

          {/* SECTION 5: INDIVIDUAL EVACUATION RECORD CARD */}
          <div className="glass-l2 rounded-[32px] sm:rounded-[38px] p-6 border border-white/60 shadow-lg flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl glass-l3 text-amber-600 flex items-center justify-center shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-950">Evacuation Times</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Latest Individual Evacuation Record
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Formula: Time Taken = QR Scanned At − QR Created At
              </p>
            </div>

            {shelterArrivals.length > 0 ? (
              (() => {
                const latest = shelterArrivals[0];
                return (
                  <div className="glass-l1 border-2 border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                      <span className="text-xs font-mono text-slate-600">
                        Pass ID: <span className="text-[#007AFF] font-bold">{latest.short_ref}</span>
                      </span>
                      <span className="text-xs font-sans font-bold text-slate-900">
                        {latest.head_name}
                      </span>
                    </div>

                    <div className="space-y-3 font-mono">
                      <div>
                        <div className="text-[11px] font-sans font-medium text-slate-500">
                          QR Created At:
                        </div>
                        <div className="text-base font-bold text-slate-950">
                          {formatClockTime(latest.qr_created_at)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-sans font-medium text-slate-500">
                          QR Scanned At:
                        </div>
                        <div className="text-base font-bold text-slate-950">
                          {formatClockTime(latest.qr_scanned_at)}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60">
                        <div className="text-[11px] font-sans font-bold text-amber-700">
                          Time Taken:
                        </div>
                        <div className="text-xl font-black text-amber-600">
                          {latest.arrival_duration_formatted}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-sans font-medium text-slate-500">
                          Status:
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-300/70">
                          ✓ Reached Shelter
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 text-[10px] text-slate-500 font-sans">
                      Timer frozen permanently at verified gatekeeper scan timestamp.
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="glass-l1 border border-white/60 rounded-2xl p-6 space-y-3 text-center text-slate-500 text-xs font-medium">
                Waiting for first evacuation scan.
              </div>
            )}

            {/* Quick Analytics */}
            <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Fastest Arrival:</span>
                <span className="font-mono text-emerald-700 font-bold">
                  {shelterArrivals.length > 0
                    ? formatDurationDisplay(
                        Math.min(
                          ...shelterArrivals.map((a) => a.arrival_duration_seconds)
                        )
                      )
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Average Arrival:</span>
                <span className="font-mono text-amber-700 font-bold">
                  {summary.average_arrival_formatted}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Longest Journey:</span>
                <span className="font-mono text-rose-700 font-bold">
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
        <div className="glass-l2 rounded-[32px] sm:rounded-[38px] p-6 border border-white/60 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl glass-l3 text-rose-600 flex items-center justify-center shadow-xs">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">Activity Log</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Live streaming operational feed of system and field events
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 glass-l1 p-1 rounded-2xl border border-white/60 text-[11px]">
              <button
                onClick={() => setActivityFilter("ALL")}
                className={`px-3 py-1 rounded-xl font-medium transition ${
                  activityFilter === "ALL"
                    ? "glass-pill-tab-all-active text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setActivityFilter("ARRIVALS")}
                className={`px-3 py-1 rounded-xl font-medium transition ${
                  activityFilter === "ARRIVALS"
                    ? "glass-pill-tab-all-active text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Arrivals
              </button>
              <button
                onClick={() => setActivityFilter("SCANNERS")}
                className={`px-3 py-1 rounded-xl font-medium transition ${
                  activityFilter === "SCANNERS"
                    ? "glass-pill-tab-all-active text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Scanners
              </button>
              <button
                onClick={() => setActivityFilter("USERS")}
                className={`px-3 py-1 rounded-xl font-medium transition ${
                  activityFilter === "USERS"
                    ? "glass-pill-tab-all-active text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Visitors
              </button>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs glass-l1 rounded-2xl border border-white/60 font-medium">
              No activity events found for the selected filter.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredEvents.map((evt) => {
                let badgeColor = "glass-l1 text-slate-700 border-white/60";
                if (evt.type === "SHELTER_ARRIVAL")
                  badgeColor = "bg-emerald-100/80 text-emerald-800 border-emerald-300/70";
                if (evt.type === "QR_SCAN_SUCCESS")
                  badgeColor = "bg-sky-100/80 text-[#007AFF] border-sky-300/70";
                if (evt.type === "QR_SCANNER_OPENED")
                  badgeColor = "bg-amber-100/80 text-amber-800 border-amber-300/70";
                if (evt.type === "USER_ENTERED")
                  badgeColor = "bg-purple-100/80 text-purple-800 border-purple-300/70";
                if (evt.type === "USER_LEFT" || evt.type === "USER_INACTIVE")
                  badgeColor = "bg-rose-100/80 text-rose-800 border-rose-300/70";

                return (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-2xl glass-l1 border border-white/60 hover:bg-white/50 transition flex items-start justify-between gap-3 text-xs shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${badgeColor}`}
                        >
                          {evt.type.replace(/_/g, " ")}
                        </span>
                        <span className="font-bold text-slate-950">{evt.title}</span>
                      </div>
                      <p className="text-slate-600 text-xs font-medium">{evt.description}</p>
                    </div>

                    <div className="text-right shrink-0 font-mono text-[11px] text-slate-500">
                      <div className="font-semibold text-slate-700">{formatClockTime(evt.timestamp)}</div>
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
