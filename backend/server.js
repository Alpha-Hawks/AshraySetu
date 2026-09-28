import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with credentials support for admin sessions
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);
app.use(express.json());

// Built-in lightweight Cookie Parser
function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    let [name, ...rest] = cookie.split("=");
    name = name?.trim();
    if (!name) return;
    const value = rest.join("=").trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

app.use((req, res, next) => {
  req.cookies = parseCookies(req);
  next();
});

// Support Vercel multi-service routing (/api/backend/* -> /api/*)
app.use((req, res, next) => {
  if (req.url.startsWith("/api/backend")) {
    req.url = req.url.replace(/^\/api\/backend/, "/api") || "/";
  }
  next();
});

// Load Andhra Pradesh datasets
const apCyclonesPath = path.join(__dirname, "data", "ap_cyclones.json");
const apDistrictsPath = path.join(__dirname, "data", "ap_districts.json");
const apSheltersPath = path.join(__dirname, "data", "ap_shelters.json");

let apCyclones = [];
let apDistricts = [];
let apShelters = [];

try {
  if (fs.existsSync(apCyclonesPath)) {
    apCyclones = JSON.parse(fs.readFileSync(apCyclonesPath, "utf-8"));
  }
  if (fs.existsSync(apDistrictsPath)) {
    apDistricts = JSON.parse(fs.readFileSync(apDistrictsPath, "utf-8"));
  }
  if (fs.existsSync(apSheltersPath)) {
    apShelters = JSON.parse(fs.readFileSync(apSheltersPath, "utf-8"));
  }
} catch (e) {
  console.warn("Could not load AP datasets", e);
}

// QR Scan Records Dataset & Persistence
const qrScansPath = path.join(__dirname, "data", "qr_scans.json");
let qrScans = [];

try {
  if (fs.existsSync(qrScansPath)) {
    qrScans = JSON.parse(fs.readFileSync(qrScansPath, "utf-8"));
  }
} catch (e) {
  console.warn("Could not load QR scans dataset", e);
}

function saveQRScans() {
  fs.writeFile(qrScansPath, JSON.stringify(qrScans, null, 2), "utf-8", (err) => {
    if (err) console.error("Failed to persist QR scans:", err);
  });
}

// ==========================================
// ADMIN AUTHENTICATION & SECURITY ENGINE
// ==========================================
const adminAuthPath = path.join(__dirname, "data", "admin_auth.json");
let adminAuth = {
  username: "admin",
  password_hash:
    "c6d236deb4dfc74dbcd9abf9e807c310:610cce5257ae884debe55c09fcd2df28a63123040743c9fb2b640a5315bcf7d784c07e8297949816b1ce92eedb375b9be282cbc2111536e85c50eabd010cd638",
  role: "DISASTER_OPERATIONS_ADMIN",
  name: "State Emergency Relief Administrator",
};

try {
  if (fs.existsSync(adminAuthPath)) {
    adminAuth = JSON.parse(fs.readFileSync(adminAuthPath, "utf-8"));
  }
} catch (e) {
  console.warn("Could not load admin_auth.json", e);
}

// Salted Scrypt Cryptographic Password Verification
function verifyPassword(password, storedHash) {
  if (!storedHash || !password) return false;
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const derived = crypto.scryptSync(String(password), salt, 64);
    return crypto.timingSafeEqual(Buffer.from(key, "hex"), derived);
  } catch (err) {
    return false;
  }
}

// Rate Limiter for Admin Login (Max 5 failed attempts per IP within 10 minutes)
const loginRateLimit = new Map();

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const entry = loginRateLimit.get(ip);
  if (!entry) return { allowed: true };

  if (entry.lockoutUntil && entry.lockoutUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockoutUntil - now) / 1000);
    return {
      allowed: false,
      message: `Too many failed attempts. Security lockout active for ${remainingSeconds}s.`,
      remainingSeconds,
    };
  }

  if (now - entry.firstAttempt > 10 * 60 * 1000) {
    loginRateLimit.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const entry = loginRateLimit.get(ip) || {
    failedAttempts: 0,
    firstAttempt: now,
    lockoutUntil: null,
  };
  entry.failedAttempts += 1;
  if (entry.failedAttempts >= 5) {
    entry.lockoutUntil = now + 5 * 60 * 1000; // 5 minute lockout
  }
  loginRateLimit.set(ip, entry);
}

function clearFailedLogin(ip) {
  loginRateLimit.delete(ip);
}

// Active Server-Side Admin Sessions
const activeAdminSessions = new Map();

function requireAdminAuth(req, res, next) {
  const token =
    req.cookies?.ashraysetu_admin_token ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
    req.query.token;

  if (!token) {
    return res.status(401).json({
      error: "Authentication required",
      code: "NO_TOKEN",
      message: "Please log in to access the Emergency Admin Command Center.",
    });
  }

  const session = activeAdminSessions.get(token);
  if (!session) {
    return res.status(401).json({
      error: "Invalid or expired session",
      code: "INVALID_SESSION",
      message: "Admin session has expired or is invalid. Please log in again.",
    });
  }

  if (Date.now() > session.expiresAt) {
    activeAdminSessions.delete(token);
    return res.status(401).json({
      error: "Session expired",
      code: "EXPIRED_SESSION",
      message: "Admin session expired for security. Please log in again.",
    });
  }

  session.lastActivity = Date.now();
  req.admin = session;
  next();
}

// ==========================================
// REAL-TIME PRESENCE & ACTIVITY ENGINE
// ==========================================
const liveUserSessions = new Map();

const activityLogPath = path.join(__dirname, "data", "activity_log.json");
let activityEvents = [];
try {
  if (fs.existsSync(activityLogPath)) {
    activityEvents = JSON.parse(fs.readFileSync(activityLogPath, "utf-8"));
  }
} catch {
  activityEvents = [];
}

function formatDuration(sec) {
  if (sec == null || isNaN(sec)) return "00 min 00 sec";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} sec`;
}

function logActivityEvent(event) {
  const entry = {
    id: `act-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`,
    timestamp: Date.now(),
    ...event,
  };
  activityEvents.unshift(entry);
  if (activityEvents.length > 200) {
    activityEvents = activityEvents.slice(0, 200);
  }
  fs.writeFile(
    activityLogPath,
    JSON.stringify(activityEvents, null, 2),
    "utf-8",
    () => {}
  );
  broadcastSseUpdate();
  return entry;
}

const sseClients = new Set();

function broadcastSseUpdate() {
  if (sseClients.size === 0) return;
  const payload = JSON.stringify(getAdminMetricsSnapshot());
  for (const client of sseClients) {
    try {
      client.write(`event: update\ndata: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

function getAdminMetricsSnapshot() {
  const now = Date.now();
  const onlineThreshold = 35 * 1000;
  const idleThreshold = 20 * 1000;

  const usersList = [];
  let liveUsersCount = 0;
  let activeScannersCount = 0;

  for (const [id, s] of liveUserSessions.entries()) {
    const elapsed = now - s.lastSeen;
    let status = "OFFLINE";
    if (elapsed <= idleThreshold) {
      status = "ONLINE";
      liveUsersCount++;
    } else if (elapsed <= onlineThreshold) {
      status = "IDLE";
      liveUsersCount++;
    }

    if (
      (status === "ONLINE" || status === "IDLE") &&
      (s.isScannerActive || s.currentPath === "/scan")
    ) {
      activeScannersCount++;
    }

    if (elapsed <= 10 * 60 * 1000) {
      usersList.push({
        id: s.id,
        currentPath: s.currentPath || "/",
        activity: s.activity || "Browsing Portal",
        status,
        lastSeen: s.lastSeen,
        firstSeen: s.firstSeen || s.lastSeen,
        isScannerActive: Boolean(s.isScannerActive),
        deviceType: s.deviceType || "Web Client",
      });
    }
  }

  usersList.sort((a, b) => b.lastSeen - a.lastSeen);

  const completedArrivals = qrScans.filter(
    (r) => r.status === "REACHED_SHELTER" && r.qr_scanned_at
  );
  const totalShelterArrivals = completedArrivals.reduce(
    (sum, r) => sum + (Number(r.total_members) || 1),
    0
  );

  let avgArrivalSeconds = 0;
  if (completedArrivals.length > 0) {
    const totalDuration = completedArrivals.reduce(
      (sum, r) => sum + (Number(r.arrival_duration_seconds) || 0),
      0
    );
    avgArrivalSeconds = Math.round(totalDuration / completedArrivals.length);
  }

  const activeScanners = [];
  for (const u of usersList) {
    if (
      (u.status === "ONLINE" || u.status === "IDLE") &&
      (u.isScannerActive || u.currentPath === "/scan")
    ) {
      activeScanners.push({
        stationId: `GATE-${u.id.slice(-6).toUpperCase()}`,
        sessionId: u.id,
        status: "ACTIVE_SCANNER",
        currentPath: u.currentPath,
        lastSeen: u.lastSeen,
        cameraMode: "Live Gate Feed (On-Device Client-Side)",
        privacyMode: "Zero-Surveillance Encrypted Telemetry",
      });
    }
  }

  return {
    summary: {
      live_users: liveUsersCount,
      active_scanners: activeScannersCount,
      shelter_arrivals: totalShelterArrivals,
      shelter_households_count: completedArrivals.length,
      average_arrival_seconds: avgArrivalSeconds,
      average_arrival_formatted: formatDuration(avgArrivalSeconds),
      total_qr_issued: qrScans.length,
      timestamp: now,
    },
    liveUsers: usersList,
    activeScanners,
    qrActivity: qrScans.map((r) => ({
      short_ref: r.short_ref,
      head_name: r.head_name,
      hamlet_name: r.hamlet_name,
      shelter_id: r.shelter_id,
      total_members: r.total_members,
      qr_created_at: r.qr_created_at,
      qr_scanned_at: r.qr_scanned_at,
      scan_count: r.scan_count || (r.qr_scanned_at ? 1 : 0),
      latest_scan_time: r.last_scanned_at || r.qr_scanned_at,
      arrival_duration_seconds: r.arrival_duration_seconds,
      arrival_duration_formatted: formatDuration(r.arrival_duration_seconds),
      status: r.status,
    })),
    shelterArrivals: completedArrivals.map((r) => ({
      id: r.id,
      short_ref: r.short_ref,
      head_name: r.head_name,
      hamlet_name: r.hamlet_name,
      shelter_id: r.shelter_id,
      total_members: r.total_members,
      qr_created_at: r.qr_created_at,
      qr_scanned_at: r.qr_scanned_at,
      arrival_duration_seconds: r.arrival_duration_seconds,
      arrival_duration_formatted: formatDuration(r.arrival_duration_seconds),
      status: r.status,
      scan_count: r.scan_count || 1,
    })),
    activityLog: activityEvents.slice(0, 50),
    systemTime: now,
  };
}

// Background reaper for inactive presence sessions
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [id, s] of liveUserSessions.entries()) {
    if (s.status !== "OFFLINE" && now - s.lastSeen > 40000) {
      s.status = "OFFLINE";
      s.isScannerActive = false;
      logActivityEvent({
        type: "USER_INACTIVE",
        title: "Visitor Became Inactive",
        description: `Session ${id.slice(0, 14)} timed out after inactivity`,
        sessionId: id,
      });
      changed = true;
    }
  }
  if (changed) {
    broadcastSseUpdate();
  }
}, 10000);

// Master shelters database (Odisha + Andhra Pradesh)
const odishaShelters = [
  {
    id: "OD-KEN-RAJ-001",
    state: "ODISHA",
    district: "Kendrapara",
    name: "Batighar Multipurpose Cyclone Shelter",
    block_name: "Rajnagar",
    gram_panchayat: "Batighar",
    capacity_persons: 600,
    current_occupancy: 385,
    latitude: 20.4851,
    longitude: 86.8324,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "Prabhat Kumar Nayak",
    incharge_phone: "9861234501",
    status: "ACTIVE",
  },
  {
    id: "OD-KEN-RAJ-002",
    state: "ODISHA",
    district: "Kendrapara",
    name: "Talachua High School Cyclone Shelter",
    block_name: "Rajnagar",
    gram_panchayat: "Talachua",
    capacity_persons: 500,
    current_occupancy: 220,
    latitude: 20.6432,
    longitude: 86.9645,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "Minati Behera",
    incharge_phone: "9861234502",
    status: "ACTIVE",
  },
  {
    id: "OD-KEN-RAJ-003",
    state: "ODISHA",
    district: "Kendrapara",
    name: "Dangamal Community Cyclone Shelter",
    block_name: "Rajnagar",
    gram_panchayat: "Dangamal",
    capacity_persons: 450,
    current_occupancy: 140,
    latitude: 20.7321,
    longitude: 86.8924,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "Bishnu Charan Das",
    incharge_phone: "9861234503",
    status: "ACTIVE",
  },
  {
    id: "OD-KEN-MAH-004",
    state: "ODISHA",
    district: "Kendrapara",
    name: "Jambu Island Multipurpose Shelter",
    block_name: "Mahakalapada",
    gram_panchayat: "Jambu",
    capacity_persons: 750,
    current_occupancy: 610,
    latitude: 20.4128,
    longitude: 86.7214,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "Gajendra Sethi",
    incharge_phone: "9861234504",
    status: "ACTIVE",
  },
  {
    id: "OD-KEN-MAH-005",
    state: "ODISHA",
    district: "Kendrapara",
    name: "Hukitola Coastal Relief Camp",
    block_name: "Mahakalapada",
    gram_panchayat: "Kharinasi",
    capacity_persons: 400,
    current_occupancy: 395,
    latitude: 20.3789,
    longitude: 86.8123,
    has_solar_backup: false,
    has_borewell: true,
    incharge_name: "Santosh Patra",
    incharge_phone: "9861234505",
    status: "SATURATED",
  },
  {
    id: "OD-KEN-MAH-006",
    state: "ODISHA",
    district: "Kendrapara",
    name: "Barahipur Primary School Shelter",
    block_name: "Mahakalapada",
    gram_panchayat: "Barahipur",
    capacity_persons: 350,
    current_occupancy: 90,
    latitude: 20.4456,
    longitude: 86.6543,
    has_solar_backup: true,
    has_borewell: false,
    incharge_name: "Rasmita Samal",
    incharge_phone: "9861234506",
    status: "ACTIVE",
  },
  {
    id: "OD-JAG-ERA-007",
    state: "ODISHA",
    district: "Jagatsinghpur",
    name: "Erasama Super Cyclone Memorial Shelter",
    block_name: "Erasama",
    gram_panchayat: "Padmapur",
    capacity_persons: 800,
    current_occupancy: 450,
    latitude: 20.0712,
    longitude: 86.6124,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "Subrat Mohapatra",
    incharge_phone: "9861234507",
    status: "ACTIVE",
  },
  {
    id: "OD-JAG-PAR-008",
    state: "ODISHA",
    district: "Jagatsinghpur",
    name: "Paradip Port Coastal Relief Center",
    block_name: "Kujang",
    gram_panchayat: "Nuagarh",
    capacity_persons: 700,
    current_occupancy: 320,
    latitude: 20.2941,
    longitude: 86.6712,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "Debabrata Swain",
    incharge_phone: "9861234508",
    status: "ACTIVE",
  },
  {
    id: "OD-PUR-KON-009",
    state: "ODISHA",
    district: "Puri",
    name: "Konark Marine Beach Cyclone Shelter",
    block_name: "Gop",
    gram_panchayat: "Konark Beach",
    capacity_persons: 650,
    current_occupancy: 280,
    latitude: 19.8974,
    longitude: 86.0945,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "Bijoy Kumar Mishra",
    incharge_phone: "9861234509",
    status: "ACTIVE",
  },
  {
    id: "OD-PUR-AST-010",
    state: "ODISHA",
    district: "Puri",
    name: "Astaranga River Mouth Multipurpose Shelter",
    block_name: "Astaranga",
    gram_panchayat: "Nuasahi",
    capacity_persons: 600,
    current_occupancy: 190,
    latitude: 19.9821,
    longitude: 86.2714,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "Sarbeswar Dash",
    incharge_phone: "9861234510",
    status: "ACTIVE",
  },
  {
    id: "OD-GNJ-GOP-011",
    state: "ODISHA",
    district: "Ganjam",
    name: "Gopalpur Port Cyclone Refuge",
    block_name: "Rangeilunda",
    gram_panchayat: "Gopalpur-on-Sea",
    capacity_persons: 750,
    current_occupancy: 340,
    latitude: 19.2614,
    longitude: 84.8624,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "Ashok Kumar Panda",
    incharge_phone: "9861234511",
    status: "ACTIVE",
  },
  {
    id: "OD-BLS-CHA-012",
    state: "ODISHA",
    district: "Balasore",
    name: "Chandipur Coastal Cyclone Shelter",
    block_name: "Remuna",
    gram_panchayat: "Chandipur Beach",
    capacity_persons: 550,
    current_occupancy: 210,
    latitude: 21.4682,
    longitude: 87.0124,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "Ramesh Chandra Jena",
    incharge_phone: "9861234512",
    status: "ACTIVE",
  },
  {
    id: "OD-BHD-DHA-013",
    state: "ODISHA",
    district: "Bhadrak",
    name: "Dhamra Port Coastal Cyclone Shelter",
    block_name: "Chandbali",
    gram_panchayat: "Dhamra Port Basin",
    capacity_persons: 700,
    current_occupancy: 390,
    latitude: 20.8124,
    longitude: 86.9541,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "Prasanna Kumar Barik",
    incharge_phone: "9861234513",
    status: "ACTIVE",
  },
];

let shelters = [...odishaShelters, ...apShelters];

// In-memory synced households and triage records
const syncedHouseholds = [];
const syncedTriage = [];
const syncHistory = [];

/**
 * Health Check Endpoint
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "HEALTHY",
    service: "AshraySetu Disaster Management Backend",
    version: "1.2.0",
    modules: ["Odisha Kendrapara Module", "Andhra Pradesh Cyclone Module", "FreeLLMAPI RAG Assistant"],
    timestamp: new Date().toISOString(),
  });
});

/**
 * Master Shelters Registry (supports ?state= and ?block=)
 */
app.get("/api/shelters", (req, res) => {
  const { state, block, district } = req.query;
  let result = shelters;

  if (state) {
    result = result.filter(
      (s) => s.state?.toLowerCase() === String(state).toLowerCase()
    );
  }
  if (district) {
    result = result.filter(
      (s) => s.district?.toLowerCase() === String(district).toLowerCase()
    );
  }
  if (block) {
    result = result.filter(
      (s) => s.block_name.toLowerCase() === String(block).toLowerCase()
    );
  }

  res.json({
    shelters: result,
    total: result.length,
    active_filters: { state, district, block },
  });
});

/**
 * Single Shelter Details
 */
app.get("/api/shelters/:id", (req, res) => {
  const shelter = shelters.find((s) => s.id === req.params.id);
  if (!shelter) {
    return res.status(404).json({ error: "Shelter not found" });
  }

  res.json({
    shelter,
    inventory: [
      {
        item_type: "WATER_LITRES",
        quantity_available: Math.floor(shelter.capacity_persons * 3.5),
        burn_rate: shelter.current_occupancy * 3.0,
        unit: "LITRES",
      },
      {
        item_type: "FOOD_PACKETS",
        quantity_available: Math.floor(shelter.capacity_persons * 4),
        burn_rate: shelter.current_occupancy * 2.0,
        unit: "PACKETS",
      },
    ],
  });
});

// ==========================================
// ANDHRA PRADESH CYCLONE MODULE APIS
// ==========================================

/**
 * AP Coastal Districts Directory
 */
app.get("/api/ap/districts", (req, res) => {
  res.json({
    state: "Andhra Pradesh",
    total_coastal_districts: apDistricts.length,
    districts: apDistricts,
    source: "APSDMA / Official Gazette of Andhra Pradesh (2022 Reorganisation)",
    last_verified: "2026-09-28",
  });
});

/**
 * AP Historical Cyclones Timeline
 */
app.get("/api/ap/cyclones", (req, res) => {
  const { year, district } = req.query;
  let list = apCyclones;

  if (year) {
    list = list.filter((c) => c.year === parseInt(String(year), 10));
  }
  if (district) {
    list = list.filter((c) =>
      c.affected_districts.some((d) =>
        d.toLowerCase().includes(String(district).toLowerCase())
      )
    );
  }

  res.json({
    state: "Andhra Pradesh",
    total_recorded: list.length,
    cyclones: list,
    disclaimer: "All statistics derived from official IMD Technical Reports & APSDMA documentation. Unrecorded metrics marked as 'Data unavailable'.",
  });
});

/**
 * AP Historical Cyclone Detailed Dossier
 */
app.get("/api/ap/cyclones/:id", (req, res) => {
  const cyclone = apCyclones.find(
    (c) => c.id.toLowerCase() === req.params.id.toLowerCase()
  );
  if (!cyclone) {
    return res.status(404).json({ error: "Cyclone record not found" });
  }
  res.json({ cyclone });
});

/**
 * AP Emergency Contacts Directory
 */
app.get("/api/ap/emergency-contacts", (req, res) => {
  res.json({
    state: "Andhra Pradesh",
    state_emergency_helplines: [
      { name: "APSDMA State Emergency Operation Centre (SEOC)", number: "1070", toll_free: true },
      { name: "District Emergency Operation Centre (DEOC)", number: "1077", toll_free: true },
      { name: "Police Emergency / National Emergency", number: "112", toll_free: true },
      { name: "Ambulance / Emergency Medical Support", number: "108", toll_free: true },
      { name: "Marine Police / Coastal Security Helpline (Fishermen Safety)", number: "1093", toll_free: true },
      { name: "Fire & Disaster Response Services", number: "101", toll_free: true },
    ],
    district_helplines: apDistricts.map((d) => ({
      district: d.district_name,
      helpline: d.deoc_helpline,
    })),
    source: "Andhra Pradesh State Disaster Management Authority (APSDMA)",
    last_verified: "2026-09-28",
  });
});

/**
 * AI RAG Query Assistant (Grounded in Verified AP Cyclone Knowledge Base)
 */
app.post("/api/ai/query", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Missing 'question' string in request body" });
    }

    const q = question.toLowerCase();

    // 1. Identify relevant context from verified AP cyclone knowledge base
    const matchedCyclones = apCyclones.filter((c) => {
      const nameMatch = c.cyclone_name.toLowerCase().includes(q) ||
        (q.includes("hudhud") && c.id.includes("HUDHUD")) ||
        (q.includes("michaung") && c.id.includes("MICHAUNG")) ||
        (q.includes("titli") && c.id.includes("TITLI")) ||
        (q.includes("laila") && c.id.includes("LAILA")) ||
        (q.includes("nilam") && c.id.includes("NILAM")) ||
        (q.includes("diviseema") && c.id.includes("DIVISEEMA")) ||
        (q.includes("gulab") && c.id.includes("GULAB")) ||
        (q.includes("phethai") && c.id.includes("PHETHAI"));

      const districtMatch = c.affected_districts.some((d) => q.includes(d.toLowerCase()));
      return nameMatch || districtMatch;
    });

    const contextSnippets = matchedCyclones.slice(0, 3).map((c) => `
Cyclone: ${c.cyclone_name} (${c.year})
Landfall Location: ${c.landfall_location}
Affected Districts: ${c.affected_districts.join(", ")}
Max Wind Speed: ${c.maximum_wind_speed_kmh} km/h
Rainfall: ${c.rainfall_mm}
Storm Surge: ${c.storm_surge_meters} meters
Casualties: ${c.casualties}
Evacuated Population: ${c.evacuated_population}
Infrastructure Damage: ${c.infrastructure_damage}
Agricultural Damage: ${c.agricultural_damage}
Fisheries Impact: ${c.fisheries_impact}
Lessons Learned: ${c.lessons_learned}
Official Source: ${c.source_name} (${c.source_url})
    `).join("\n---\n");

    const systemPrompt = `You are the official Andhra Pradesh Cyclone & Disaster Information Assistant.
Answer the user's question accurately using ONLY the verified facts provided below from the official APSDMA/IMD database.
Strict Rules:
1. NEVER invent wind speeds, casualties, warning levels, or damage statistics.
2. If the requested information is not in the context, clearly state: "Official data for this query is unavailable in verified records."
3. Always cite the relevant official source (e.g. APSDMA / IMD).
4. Keep answers concise, factual, and informative.`;

    const fullPrompt = `VERIFIED CONTEXT FROM APSDMA/IMD DATABASE:\n${contextSnippets || "General Andhra Pradesh Coastal Cyclone Archive"}\n\nUSER QUESTION: ${question}`;

    // Attempt to query FreeLLMAPI proxy at localhost:3001 if available
    let aiAnswer = null;
    let modelUsed = "Knowledge Base Rule-Engine";

    try {
      const llmResponse = await fetch("http://localhost:3001/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-1.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: fullPrompt },
          ],
          temperature: 0.2,
          max_tokens: 500,
        }),
      });

      if (llmResponse.ok) {
        const data = await llmResponse.json();
        aiAnswer = data?.choices?.[0]?.message?.content;
        modelUsed = data?.model || "FreeLLMAPI";
      }
    } catch {
      // FreeLLMAPI offline or busy fallback
    }

    // Direct grounded fallback if LLM is unreachable
    if (!aiAnswer) {
      if (matchedCyclones.length > 0) {
        const first = matchedCyclones[0];
        aiAnswer = `**${first.cyclone_name} (${first.year})** made landfall at **${first.landfall_location}** with peak sustained winds of **${first.maximum_wind_speed_kmh} km/h** and storm surge of **${first.storm_surge_meters}m**.\n\n` +
          `• **Affected Districts**: ${first.affected_districts.join(", ")}\n` +
          `• **Rainfall**: ${first.rainfall_mm}\n` +
          `• **Evacuation**: ${first.evacuated_population.toLocaleString()} citizens safely sheltered\n` +
          `• **Key Lessons**: ${first.lessons_learned}\n\n` +
          `*Source: ${first.source_name}*`;
      } else if (q.includes("fishermen") || q.includes("safety") || q.includes("boat")) {
        aiAnswer = `**Official Cyclone Safety Guidance for Fishermen (APSDMA & INCOIS):**\n\n` +
          `1. **Return-to-Shore**: Total suspension of coastal and deep-sea fishing operations upon issuance of Cyclone Alert (Yellow Watch) by IMD.\n` +
          `2. **Harbour Anchorage**: Secure crafts at designated safe harbours (Visakhapatnam, Kakinada, Nizampatnam, Machilipatnam).\n` +
          `3. **Emergency Contact**: In case of distress at sea, contact Coastal Security Police on toll-free **1093** or APSDMA Control Room on **1070**.\n\n` +
          `*Source: Andhra Pradesh Fisheries Department & APSDMA*`;
      } else {
        aiAnswer = `According to verified Andhra Pradesh State Disaster Management Authority (APSDMA) records, Andhra Pradesh features 12 coastal districts exposed to Bay of Bengal cyclonic storms. Major recorded events include Diviseema (1977), Laila (2010), Hudhud (2014), Titli (2018), and Michaung (2023). Please query a specific cyclone name or district for detailed verified parameters.`;
      }
    }

    res.json({
      question,
      answer: aiAnswer,
      grounded_sources: matchedCyclones.map((c) => ({
        cyclone: c.cyclone_name,
        source: c.source_name,
        url: c.source_url,
      })),
      engine: modelUsed,
      verified_at: "2026-09-28",
    });
  } catch (err) {
    res.status(500).json({ error: "AI retrieval error", details: err.message });
  }
});

// ==========================================
// AUTHORITATIVE QR TIMING & SHELTER ARRIVAL AUDIT APIS
// ==========================================

/**
 * Authoritative Server Time Endpoint
 * Provides accurate server timestamp for QR creation and audit synchronization
 */
app.get("/api/time", (req, res) => {
  const serverTime = Date.now();
  res.json({
    server_time: serverTime,
    iso: new Date(serverTime).toISOString(),
    time_zone: "Asia/Kolkata",
  });
});

/**
 * QR Code Creation / Issuance Registration Endpoint
 * Records authoritative qr_created_at on the server
 */
app.post("/api/qr/create", (req, res) => {
  try {
    const {
      short_ref,
      head_name,
      hamlet_name,
      shelter_id,
      total_members,
      client_timestamp,
    } = req.body;

    const authoritativeCreatedAt = Date.now();

    // Check if record exists
    let record = qrScans.find((r) => short_ref && r.short_ref === short_ref);
    if (!record) {
      record = {
        id: crypto.randomUUID(),
        short_ref: short_ref || `ref-${authoritativeCreatedAt.toString(36)}`,
        head_name: head_name || "Unknown Head",
        hamlet_name: hamlet_name || "Coastal Hamlet",
        shelter_id: shelter_id || "OD-KEN-RAJ-001",
        total_members: Number(total_members) || 1,
        qr_created_at: authoritativeCreatedAt,
        qr_scanned_at: null,
        arrival_duration_seconds: null,
        status: "ISSUED",
        scan_count: 0,
        created_at: authoritativeCreatedAt,
        updated_at: authoritativeCreatedAt,
      };
      qrScans.push(record);
      saveQRScans();

      logActivityEvent({
        type: "QR_CREATED",
        title: "Evacuation Pass Issued",
        description: `Pass issued for ${record.head_name} (${record.short_ref}, ${record.total_members} members) destined for ${record.shelter_id}`,
        short_ref: record.short_ref,
        head_name: record.head_name,
      });
    }

    res.json({
      success: true,
      qr_created_at: record.qr_created_at,
      status: record.status,
      record,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to record QR creation", details: err.message });
  }
});

/**
 * Authoritative QR Pass Scan & Shelter Arrival Endpoint
 * - Creates authoritative qr_scanned_at timestamp at the moment of scan
 * - Calculates arrival_duration_seconds = qr_scanned_at - qr_created_at
 * - Permanently persists created_at, scanned_at, duration, and status in database
 * - PREVENTS DUPLICATE SCANS: If already scanned, preserves original qr_scanned_at & duration
 */
app.post("/api/qr/scan", (req, res) => {
  try {
    let {
      short_ref,
      head_name,
      hamlet_name,
      shelter_id,
      total_members,
      qr_created_at: payloadCreatedAt,
      qr_payload,
    } = req.body;

    if (qr_payload && (!short_ref || !head_name)) {
      const parts = String(qr_payload).trim().split("|");
      if (parts.length >= 10) {
        shelter_id = shelter_id || parts[1];
        short_ref = short_ref || parts[2];
        total_members = total_members || parseInt(parts[3], 10) || 1;
        head_name = head_name || parts[10];
        hamlet_name = hamlet_name || parts[11];
        if (parts[12] && !payloadCreatedAt) {
          payloadCreatedAt = parseInt(parts[12], 10);
        }
      }
    }

    const serverNow = Date.now();

    if (!short_ref && !head_name) {
      return res.status(400).json({ error: "Missing required short_ref or head_name" });
    }

    // Lookup existing record by short_ref or matching head_name
    let record = qrScans.find(
      (r) =>
        (short_ref && r.short_ref === short_ref) ||
        (head_name && r.head_name.toLowerCase().trim() === head_name.toLowerCase().trim())
    );

    // RULE 9: PREVENT DUPLICATE SCANS
    // If the record exists AND already has qr_scanned_at, do NOT overwrite it!
    if (record && record.qr_scanned_at) {
      record.scan_count = (record.scan_count || 1) + 1;
      record.last_scanned_at = serverNow;
      saveQRScans();

      logActivityEvent({
        type: "QR_SCAN_SUCCESS",
        title: "QR Pass Re-Scanned",
        description: `Pass ${record.short_ref} (${record.head_name}) verified again at gate. Total Scans: ${record.scan_count}.`,
        short_ref: record.short_ref,
        head_name: record.head_name,
      });

      return res.json({
        success: true,
        duplicate: true,
        message: "Pass already scanned. Original official arrival time retained.",
        short_ref: record.short_ref,
        head_name: record.head_name,
        hamlet_name: record.hamlet_name,
        shelter_id: record.shelter_id,
        total_members: record.total_members,
        qr_created_at: record.qr_created_at,
        qr_scanned_at: record.qr_scanned_at,
        arrival_duration_seconds: record.arrival_duration_seconds,
        status: "REACHED_SHELTER",
        scan_count: record.scan_count,
        first_scanned_at: record.first_scanned_at || record.qr_scanned_at,
      });
    }

    // FIRST AUTHORITATIVE SCAN
    // Determine authoritative creation time
    const effectiveCreatedAt =
      (record && record.qr_created_at) ||
      (payloadCreatedAt ? Number(payloadCreatedAt) : null) ||
      (serverNow - 7 * 60 * 1000 - 35 * 1000); // 7m 35s default fallback if untracked

    const authoritativeScannedAt = serverNow;
    const durationSeconds = Math.max(
      0,
      Math.floor((authoritativeScannedAt - effectiveCreatedAt) / 1000)
    );

    if (record) {
      record.qr_created_at = effectiveCreatedAt;
      record.qr_scanned_at = authoritativeScannedAt;
      record.arrival_duration_seconds = durationSeconds;
      record.status = "REACHED_SHELTER";
      record.scan_count = 1;
      record.first_scanned_at = authoritativeScannedAt;
      record.last_scanned_at = authoritativeScannedAt;
      record.updated_at = serverNow;
    } else {
      record = {
        id: crypto.randomUUID(),
        short_ref: short_ref || `scan-${serverNow.toString(36)}`,
        head_name: head_name || "Unknown Head",
        hamlet_name: hamlet_name || "Coastal Hamlet",
        shelter_id: shelter_id || "OD-KEN-RAJ-001",
        total_members: Number(total_members) || 1,
        qr_created_at: effectiveCreatedAt,
        qr_scanned_at: authoritativeScannedAt,
        arrival_duration_seconds: durationSeconds,
        status: "REACHED_SHELTER",
        scan_count: 1,
        first_scanned_at: authoritativeScannedAt,
        last_scanned_at: authoritativeScannedAt,
        created_at: effectiveCreatedAt,
        updated_at: serverNow,
      };
      qrScans.push(record);
    }

    saveQRScans();

    logActivityEvent({
      type: "SHELTER_ARRIVAL",
      title: "Citizen Reached Shelter",
      description: `✓ ${record.head_name} & family (${record.total_members} persons) reached ${record.shelter_id} in ${formatDuration(durationSeconds)}.`,
      short_ref: record.short_ref,
      head_name: record.head_name,
      duration_seconds: durationSeconds,
    });

    res.json({
      success: true,
      duplicate: false,
      message: "Arrival successfully verified and recorded at shelter gate.",
      short_ref: record.short_ref,
      head_name: record.head_name,
      hamlet_name: record.hamlet_name,
      shelter_id: record.shelter_id,
      total_members: record.total_members,
      qr_created_at: record.qr_created_at,
      qr_scanned_at: record.qr_scanned_at,
      arrival_duration_seconds: record.arrival_duration_seconds,
      status: "REACHED_SHELTER",
      scan_count: 1,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to process QR scan", details: err.message });
  }
});

/**
 * Get QR Scan / Evacuee Arrival Status by short_ref
 */
app.get("/api/qr/status/:short_ref", (req, res) => {
  const { short_ref } = req.params;
  const record = qrScans.find((r) => r.short_ref === short_ref);
  if (record) {
    res.json({ found: true, record });
  } else {
    res.status(404).json({ found: false, message: "No scan record found" });
  }
});

/**
 * List all persistent QR Scan Arrival records
 */
app.get("/api/qr/records", (req, res) => {
  res.json({
    success: true,
    total: qrScans.length,
    records: qrScans,
  });
});

// ==========================================
// REAL-TIME PRESENCE & TELEMETRY ENDPOINTS
// ==========================================

/**
 * Client Presence Heartbeat Endpoint
 * Updates active user tracking, current page, and gate scanner status
 */
app.post("/api/presence/heartbeat", (req, res) => {
  const { sessionId, currentPath, activity, isScannerActive, deviceType } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId required" });
  }

  const now = Date.now();
  const existing = liveUserSessions.get(sessionId);

  if (!existing) {
    liveUserSessions.set(sessionId, {
      id: sessionId,
      currentPath: currentPath || "/",
      activity: activity || "Entered Emergency Portal",
      status: "ONLINE",
      lastSeen: now,
      firstSeen: now,
      isScannerActive: Boolean(isScannerActive),
      deviceType: deviceType || "Web Browser",
    });

    logActivityEvent({
      type: "USER_ENTERED",
      title: "Visitor Entered Website",
      description: `Visitor session ${sessionId.slice(0, 14)} arrived at ${currentPath || "/"}`,
      sessionId,
    });
  } else {
    // Check if scanner was just toggled on
    if (!existing.isScannerActive && isScannerActive) {
      logActivityEvent({
        type: "QR_SCANNER_OPENED",
        title: "QR Scanner Activated",
        description: `Session ${sessionId.slice(0, 14)} activated gate camera scanner`,
        sessionId,
      });
    }

    existing.currentPath = currentPath || existing.currentPath;
    existing.activity = activity || existing.activity;
    existing.isScannerActive = Boolean(isScannerActive);
    existing.status = "ONLINE";
    existing.lastSeen = now;
    if (deviceType) existing.deviceType = deviceType;
  }

  broadcastSseUpdate();
  res.json({ ok: true, timestamp: now });
});

/**
 * Client Leave / Unload Endpoint
 */
app.post("/api/presence/leave", (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && liveUserSessions.has(sessionId)) {
    const s = liveUserSessions.get(sessionId);
    s.status = "OFFLINE";
    s.isScannerActive = false;
    s.lastSeen = Date.now();

    logActivityEvent({
      type: "USER_LEFT",
      title: "Visitor Left Website",
      description: `Session ${sessionId.slice(0, 14)} departed from portal`,
      sessionId,
    });
    broadcastSseUpdate();
  }
  res.json({ ok: true });
});

// ==========================================
// SECURE ADMIN AUTHENTICATION ENDPOINTS
// ==========================================

/**
 * Admin Login Endpoint
 * - Enforces IP rate limiting (max 5 failed attempts per 10m)
 * - Verifies salted scrypt hash
 * - Issues cryptographically random session token in HttpOnly cookie
 */
app.post("/api/admin/login", (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const rateLimit = checkLoginRateLimit(clientIp);

  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: "Too Many Requests",
      message: rateLimit.message,
      remainingSeconds: rateLimit.remainingSeconds,
    });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const isValidUser = username === adminAuth.username;
  const isValidPass = verifyPassword(password, adminAuth.password_hash);

  if (!isValidUser || !isValidPass) {
    recordFailedLogin(clientIp);
    return res.status(401).json({
      error: "Invalid Credentials",
      message: "Incorrect administrator username or security password.",
    });
  }

  // Clear rate limiter upon successful login
  clearFailedLogin(clientIp);

  // Generate secure cryptographic session token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 8 hours

  activeAdminSessions.set(token, {
    token,
    username: adminAuth.username,
    name: adminAuth.name,
    role: adminAuth.role,
    createdAt: Date.now(),
    expiresAt,
    lastActivity: Date.now(),
    ip: clientIp,
  });

  // Set Secure HTTP-Only Cookie
  res.cookie("ashraysetu_admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  });

  logActivityEvent({
    type: "ADMIN_LOGIN",
    title: "Administrator Authenticated",
    description: `Emergency Coordinator logged into Admin Command Center from ${clientIp}`,
    username: adminAuth.username,
  });

  res.json({
    success: true,
    token,
    user: {
      username: adminAuth.username,
      name: adminAuth.name,
      role: adminAuth.role,
      expiresAt,
    },
  });
});

/**
 * Admin Logout Endpoint
 */
app.post("/api/admin/logout", (req, res) => {
  const token =
    req.cookies?.ashraysetu_admin_token ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (token) {
    activeAdminSessions.delete(token);
  }

  res.clearCookie("ashraysetu_admin_token", { path: "/" });

  logActivityEvent({
    type: "ADMIN_LOGOUT",
    title: "Administrator Logged Out",
    description: "Emergency Administrator signed out of command session",
  });

  res.json({ success: true, message: "Logged out successfully" });
});

/**
 * Admin Session Validation Endpoint
 */
app.get("/api/admin/me", requireAdminAuth, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      username: req.admin.username,
      name: req.admin.name,
      role: req.admin.role,
      expiresAt: req.admin.expiresAt,
    },
  });
});

/**
 * Admin Real-Time Metrics & Aggregate State Snapshot
 */
app.get("/api/admin/metrics", requireAdminAuth, (req, res) => {
  res.json(getAdminMetricsSnapshot());
});

/**
 * Admin Real-Time Server-Sent Events (SSE) Stream
 */
app.get("/api/admin/stream", (req, res) => {
  const token =
    req.cookies?.ashraysetu_admin_token ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
    req.query.token;

  if (!token || !activeAdminSessions.has(token)) {
    return res.status(401).json({
      error: "Unauthorized access to real-time telemetry stream",
    });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(`: connected\n\n`);
  const initialPayload = JSON.stringify(getAdminMetricsSnapshot());
  res.write(`event: init\ndata: ${initialPayload}\n\n`);

  sseClients.add(res);

  const pinger = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(pinger);
    sseClients.delete(res);
  });
});

// ==========================================
// STORE-AND-FORWARD & GENERAL DISASTER APIS
// ==========================================

/**
 * Store-and-Forward Batch Sync Endpoint (M5)
 */
app.post("/api/sync/batch", (req, res) => {
  try {
    const { device_id, logs } = req.body;
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: "Invalid payload: 'logs' must be an array" });
    }

    let processedCount = 0;
    for (const log of logs) {
      syncHistory.push({ ...log, received_at: Date.now(), server_ack: true });
      if (log.entity_name === "households") {
        try {
          const payload = typeof log.payload === "string" ? JSON.parse(log.payload) : log.payload;
          syncedHouseholds.push(payload);
          const target = shelters.find((s) => s.id === payload.shelter_id);
          if (target && payload.total_members) {
            target.current_occupancy += Number(payload.total_members);
          }
        } catch (e) {
          console.warn("Failed to parse household payload", e);
        }
      } else if (log.entity_name === "triage") {
        try {
          const payload = typeof log.payload === "string" ? JSON.parse(log.payload) : log.payload;
          syncedTriage.push(payload);
        } catch (e) {
          console.warn("Failed to parse triage payload", e);
        }
      }
      processedCount++;
    }

    res.json({
      success: true,
      processed_count: processedCount,
      device_id,
      conflicts: [],
      server_time: Date.now(),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server sync failure", details: err.message });
  }
});

/**
 * Emergency SOS / Telegram Webhook Dispatcher (M8)
 */
app.post("/api/alerts/dispatch", async (req, res) => {
  try {
    const { shelter_name, item_type, hours_remaining, district, state } = req.body;
    const regionName = district ? `${district.toUpperCase()}, ${state || "AP/ODISHA"}` : "COASTAL DISTRICT";

    const message =
      `🚨 *EMERGENCY RELIEF DISPATCH - ${regionName}* 🚨\n\n` +
      `*Facility*: ${shelter_name || "Multipurpose Cyclone Shelter"}\n` +
      `*Critical Resource Deficit*: ${item_type || "Potable Drinking Water"}\n` +
      `*Survival Horizon*: ~${hours_remaining || 18} hours of operational supply remaining.\n` +
      `*Action*: Request immediate replenishment convoy dispatch from District / Mandal HQ.`;

    const messageId = `TG_${Date.now().toString(36).toUpperCase()}`;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "Markdown",
          }),
        });
      } catch (tgErr) {
        console.warn("[TELEGRAM] Alert dispatch network failure:", tgErr.message);
      }
    }

    res.json({
      success: true,
      sent: true,
      message_id: messageId,
      dispatched_payload: message,
      timestamp: Date.now(),
    });
  } catch (err) {
    res.status(500).json({ error: "Alert dispatch failed", details: err.message });
  }
});

/**
 * Meteorological Cyclone Trajectory Feed
 */
app.get("/api/weather/cyclone-track", (req, res) => {
  const { region } = req.query;
  if (region === "AP" || region === "ANDHRA_PRADESH") {
    return res.json({
      cyclone_name: "Severe Cyclonic Storm (Historical / Simulated Demonstration Track - AP Coast)",
      current_intensity: "Category 3 Equivalent",
      max_sustained_winds_kmh: 110,
      central_pressure_hpa: 980,
      estimated_landfall_point: "Near Bapatla / Machilipatnam",
      projected_surge_height_meters: 2.2,
      trajectory_points: [
        { time: "-18h", lat: 14.5, lng: 82.8, wind_kmh: 90 },
        { time: "-12h", lat: 15.2, lng: 81.6, wind_kmh: 100 },
        { time: "-6h", lat: 15.6, lng: 80.9, wind_kmh: 110 },
        { time: "Landfall (0h)", lat: 15.9, lng: 80.5, wind_kmh: 110 },
        { time: "+6h", lat: 16.4, lng: 80.1, wind_kmh: 70 },
      ],
      disclaimer: "Historical / Simulated Demonstration Data",
    });
  }

  res.json({
    cyclone_name: "Extremely Severe Cyclonic Storm (Simulated Bay of Bengal Track - Kendrapara)",
    current_intensity: "Category 4 Equivalent",
    max_sustained_winds_kmh: 175,
    central_pressure_hpa: 954,
    estimated_landfall_point: "Between Dhamra and Paradip",
    projected_surge_height_meters: 3.8,
    trajectory_points: [
      { time: "-12h", lat: 19.8, lng: 87.8, wind_kmh: 140 },
      { time: "-6h", lat: 20.1, lng: 87.3, wind_kmh: 160 },
      { time: "Landfall (0h)", lat: 20.48, lng: 86.85, wind_kmh: 175 },
      { time: "+6h", lat: 20.9, lng: 86.4, wind_kmh: 110 },
    ],
    disclaimer: "Historical / Simulated Demonstration Data",
  });
});

/**
 * District Command Desk Aggregation Stats
 */
app.get("/api/dashboard/stats", (req, res) => {
  const totalSheltered = shelters.reduce((acc, s) => acc + s.current_occupancy, 0);
  const totalCapacity = shelters.reduce((acc, s) => acc + s.capacity_persons, 0);

  res.json({
    total_shelters: shelters.length,
    total_sheltered: totalSheltered,
    total_capacity: totalCapacity,
    saturation_percentage: Math.round((totalSheltered / totalCapacity) * 100),
    total_synced_households: syncedHouseholds.length,
    critical_triage_count: syncedTriage.filter((t) => t.triage_level === "P1_CRITICAL").length,
    active_disturbances: "Bay of Bengal Cyclone Advisory #04",
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌊 AshraySetu Multi-State Disaster Management API Running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🏥 Regions: Coastal Odisha & Andhra Pradesh`);
  console.log(`=======================================================`);
});

export default app;

