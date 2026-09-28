# AshraySetu (ଆଶ୍ରୟ ସେତୁ)
### Cyclone Shelter & Evacuation Management System for Coastal Odisha
*Built for the Smart India Hackathon — Student Innovation: Disaster Management*

---

## 🌊 Overview
**AshraySetu** is an offline-first Progressive Web Application (PWA) engineered for Gram Panchayat disaster committees, shelter managers, and district disaster authorities in Kendrapara District, Odisha. It enables decentralized household evacuation intake, special-needs medical triage, offline QR-code token passing, and survival resource depletion tracking across severe cyclonic storms when commercial cellular networks and electrical power grids collapse.

---

## 🚀 Key Modules (M1 – M8)
- **M1 (Role & Auth Gateway)**: Frictionless anonymous session generation for field volunteers and role-based access for district authorities.
- **M2 (Evacuee Intake & Triage Engine)**: Touch-optimized, high-contrast form with bilingual Odia (ଓଡ଼ିଆ) and English text to record demographics, infants, seniors, livestock, and clinical triage flags (Pregnant, Bedridden, Infant, Disabled, Chronic/Dialysis).
- **M3 (QR Token & Verification Subsystem)**: Encodes family details into an ultra-compact visual digital pass rendered on-screen without internet; includes camera-based gatekeeper scanner to verify and admit evacuees.
- **M4 (Shelter Inventory & Resource Ledger)**: Continuous accounting of potable water, dry food, baby formula, and ORS based on Sphere minimum humanitarian standards, warning when stock falls below 24 hours.
- **M5 (Offline Storage & Sync Engine)**: All writes persist instantly in browser-native IndexedDB via Dexie.js. Mutation logs are queued and automatically batch-synchronized to the edge server when connectivity returns.
- **M6 (Spatial Mapping & Proximity Subsystem)**: Interactive Leaflet map rendering coastal shelters in Rajnagar and Mahakalapada blocks, calculating geodesic distance to nearest shelters and displaying a simulated 3.5m storm-surge coastal buffer via Turf.js.
- **M7 (District Command Desk)**: Administrative oversight view for the Block Development Officer (BDO) and District Emergency Operation Centre (DEOC) showing capacity heatmaps and triage cases.
- **M8 (Emergency Dispatch Module)**: Formatted Telegram emergency broadcast triggers to dispatch relief tankers to shelters facing imminent stockouts.

---

## 🛠️ Technology Stack
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Local Storage**: IndexedDB via Dexie.js
- **Styling**: Tailwind CSS (Disaster Management High-Contrast Palette)
- **Mapping & GIS**: Leaflet, `react-leaflet`, `@turf/turf`
- **QR Encoding & Camera Decoding**: `qrcode`, `html5-qrcode`
- **Icons & UI**: `lucide-react`

---

## 🏃 How to Run Locally

### 1. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your mobile browser or desktop.

### 2. Build for Production
```bash
npm run build
npm start
```

---

## 📋 5-Minute Evaluator Demonstration Walkthrough
1. **Open the App**: Navigate to `http://localhost:3000`. Click **"Load Evaluator Demo Seed"** on the home screen to instantly populate sample Kendrapara shelters and mock households.
2. **Simulate Total Disconnection**: In the top alert bar, click **"✈️ Flight Mode: OFF"** to toggle simulated offline mode ON (or put your real phone into Airplane Mode). Notice the amber **OFFLINE - LOCAL STORAGE ACTIVE** status badge.
3. **Register an Evacuee Household (`/intake`)**:
   - Enter Head of Household: `Pravat Nayak`, Hamlet: `Talachua`, Ward: `4`.
   - Use the touch counter buttons to set 5 members and 1 infant.
   - Select **Pregnant Woman (P1 Critical)** under Special Vulnerability Triage.
   - Click **"Register & Generate QR Token Pass"**.
   - An on-screen visual QR pass pops up instantly in complete offline mode.
4. **Scan & Check-In at Shelter Gate (`/scan`)**:
   - Open `/scan`.
   - Click **"Test: Pravat (Pregnant P1)"** (or point a camera at the pass).
   - Click **"Confirm Shelter Admission"** — shelter headcount updates in local IndexedDB without any server connection.
5. **Inspect Dynamic Depletion (`/inventory`)**:
   - Open `/inventory`.
   - Notice that with the new evacuees, available water hours drop dynamically.
   - Items with < 24h supply turn bright red with an urgent replenishment alert.
6. **Reconnect & Sync (`/dashboard`)**:
   - Toggle **"Flight Mode: OFF"** in the top banner.
   - Open `/dashboard`. Notice that the district command desk immediately reflects the reconciled headcount, lists the pregnant evacuee in the **P1 Critical Medical Triage Queue**, and allows sending an emergency Telegram SOS dispatch!
