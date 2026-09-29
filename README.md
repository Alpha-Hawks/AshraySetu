## 🌐 Live Demo

### 🚀 AshraySetu is Live

Experience the deployed application:

**🔗 Live Application:**  
https://ashray-setu.vercel.app/

AshraySetu is deployed as a production-accessible web application and provides an operational interface for cyclone shelter and evacuation management.

### Available Live Modules

- 🏠 Household Intake
- 🏥 Medical & Vulnerability Triage
- 📦 Shelter Stock & Inventory Management
- 🔐 QR Pass Generation & Verification
- 🗺️ Spatial Map & Inundation Visualization
- 🖥️ District Emergency Command Desk
- 🚨 Emergency Alert / Dispatch Workflow
- 📡 Offline-First Data Storage
- 🔄 Cloud Synchronization
- 🌊 Coastal Disaster Monitoring
- 📍 Odisha & Andhra Pradesh operational coverage

### Quick Start

Open the live application:

👉 https://ashray-setu.vercel.app/

For demonstration purposes, use:

**`Load Evaluator Demo Seed`**

to populate the application with demonstration data.

> ⚠️ The live deployment is a demonstration system. Do not enter real personally identifiable information or sensitive emergency-management data unless the deployment has been explicitly configured and authorized for such use.
# 🌊 AshraySetu

### Offline-First Cyclone Shelter & Evacuation Management System

> **A resilient disaster-management platform designed for cyclone-prone coastal communities, enabling evacuation intake, medical triage, QR-based shelter admission, resource tracking, GIS mapping, and district-level coordination — even when connectivity fails.**

**Built for Smart India Hackathon — Student Innovation: Disaster Management**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/App-Offline--First_PWA-5A67D8)](#-offline-first-architecture)
[![GIS](https://img.shields.io/badge/GIS-Leaflet-199900?logo=leaflet)](https://leafletjs.com/)
[![QR](https://img.shields.io/badge/QR-Offline_Verification-8A2BE2)](#-qr-token--shelter-admission)
[![License](https://img.shields.io/badge/License-Educational-lightgrey)](#-license)

---

## 📌 Overview

**AshraySetu** is an **offline-first Progressive Web Application (PWA)** designed to support cyclone evacuation and shelter operations in coastal Odisha.

The system focuses on a critical disaster-management problem:

> **What happens when evacuation and shelter operations must continue after mobile connectivity and electrical infrastructure become unreliable or unavailable?**

AshraySetu addresses this by allowing field-level data collection, QR-based identity/token verification, shelter admission, resource tracking, medical triage, and local data persistence to continue without requiring a constant internet connection.

The platform is designed around operational scenarios involving:

* Gram Panchayat disaster committees
* Field volunteers
* Shelter managers
* Block-level authorities
* District Emergency Operation Centres
* Evacuee households
* Emergency relief coordination

The current implementation focuses on **Kendrapara District, Odisha**, including shelter mapping scenarios around **Rajnagar and Mahakalapada blocks**.

---

# 🎯 Problem Statement

Cyclones can simultaneously disrupt:

* Cellular networks
* Internet connectivity
* Electrical power
* Transportation
* Communication channels
* Access to centralized databases

During these conditions, conventional cloud-dependent systems can become difficult to operate.

At the shelter level, responders still need to answer practical questions:

* Who has been evacuated?
* How many people are inside each shelter?
* Which families contain infants, elderly people, pregnant women, or people with disabilities?
* Which evacuees require medical attention?
* Can an evacuee be verified without internet connectivity?
* How much water and food remains?
* Which shelter is approaching a critical shortage?
* Where are nearby shelters?
* Which critical cases need escalation?
* What information needs to be synchronized when connectivity returns?

**AshraySetu is designed around these operational requirements.**

---

# 💡 Solution

AshraySetu combines eight coordinated modules:

| Module | Purpose                             |
| ------ | ----------------------------------- |
| **M1** | Role & Authentication Gateway       |
| **M2** | Evacuee Intake & Medical Triage     |
| **M3** | QR Token Generation & Verification  |
| **M4** | Shelter Inventory & Resource Ledger |
| **M5** | Offline Storage & Synchronization   |
| **M6** | GIS Mapping & Shelter Proximity     |
| **M7** | District Command Desk               |
| **M8** | Emergency Dispatch                  |

The central design principle is:

```text
CONNECTIVITY IS OPTIONAL
DATA COLLECTION IS NOT
```

When connectivity is available, data can synchronize with the server.

When connectivity is unavailable, the application continues operating using browser-local storage and synchronization queues.

---

# ✨ Core Features

## 🏠 1. Evacuee Household Intake

Field volunteers can register evacuated households using a touch-friendly interface.

The intake workflow supports information such as:

* Head of household
* Hamlet
* Ward
* Household size
* Infants
* Senior citizens
* Livestock
* Special vulnerability indicators
* Medical triage information

The interface is designed for high-contrast operation and supports:

* 🇮🇳 English
* ଓଡ଼ିଆ Odia

---

## 🏥 2. Medical Vulnerability Triage

AshraySetu identifies vulnerable evacuees requiring additional attention.

Supported vulnerability categories include:

* 🤰 Pregnant
* 🛏️ Bedridden
* 👶 Infant
* ♿ Disabled
* 🩺 Chronic condition
* 💉 Dialysis

The system categorizes critical cases using triage indicators such as:

```text
P1 — Critical
P2 — Priority
```

This allows shelter and district operators to identify cases requiring urgent attention.

---

# 🔐 3. QR Token & Shelter Admission

Each registered household can receive a compact digital QR token.

### Workflow

```text
Household Registration
        │
        ▼
Generate QR Token
        │
        ▼
Display Digital Pass
        │
        ▼
Shelter Gate Scanner
        │
        ▼
Verify Household
        │
        ▼
Confirm Admission
        │
        ▼
Update Shelter Headcount
```

The QR pass is generated locally and can be verified without requiring a live internet connection.

### QR verification supports:

* Camera scanning
* Digital QR pass
* Household identification
* Shelter admission confirmation
* Local headcount updates

---

# 📦 4. Shelter Inventory Management

Shelters need continuous visibility into essential resources.

AshraySetu tracks resources including:

* 💧 Potable water
* 🍚 Dry food
* 🍼 Baby formula
* 🧂 ORS

Resource availability is continuously recalculated based on shelter occupancy and consumption assumptions.

The system highlights shelters approaching critical resource levels.

### Example

```text
Water Supply
████████████████░░░░ 18 hours

⚠ CRITICAL
Supply below 24-hour threshold
```

This allows operators to identify potential shortages before resources are completely exhausted.

---

# 📡 5. Offline-First Architecture

Offline operation is one of AshraySetu's core architectural principles.

The application uses:

**IndexedDB + Dexie.js**

for browser-local persistence.

### Online Mode

```text
User
 │
 ▼
AshraySetu PWA
 │
 ├── Local Database
 │
 └── Server
       │
       ▼
    Synchronization
```

### Offline Mode

```text
User
 │
 ▼
AshraySetu PWA
 │
 ▼
IndexedDB
 │
 ▼
Local Mutation Queue
 │
 └── Wait for connectivity
```

When connectivity returns:

```text
Local Mutation Queue
        │
        ▼
Batch Synchronization
        │
        ▼
Edge / Backend Server
        │
        ▼
Reconciled Application State
```

### Design Goal

> **The application should continue collecting and processing operational data even when the network disappears.**

---

# 🗺️ 6. GIS & Shelter Proximity

AshraySetu integrates geographic information to assist evacuation and shelter management.

### Mapping Technologies

* Leaflet
* React Leaflet
* Turf.js

The GIS subsystem supports:

* Shelter visualization
* Coastal-area mapping
* Shelter proximity calculations
* Geodesic distance calculations
* Simulated storm-surge coastal buffer visualization

The current documented mapping scenario covers shelters in:

* Rajnagar
* Mahakalapada

---

# 🖥️ 7. District Command Desk

The District Command Desk provides a centralized operational view for district-level authorities.

It is designed to provide visibility into:

* Shelter occupancy
* Shelter capacity
* Medical triage cases
* Resource availability
* Critical shortages
* Evacuation status
* Geographic shelter distribution

The dashboard helps transform decentralized shelter-level information into a district-level operational picture.

---

# 🚨 8. Emergency Dispatch

When a shelter approaches a critical resource shortage, the system can prepare an emergency dispatch action.

The documented workflow supports formatted:

**Telegram emergency broadcasts**

for requesting relief resources such as tankers for shelters facing imminent stockouts.

Example workflow:

```text
Inventory Monitoring
        │
        ▼
Resource Below Threshold
        │
        ▼
Critical Alert
        │
        ▼
Emergency Dispatch
        │
        ▼
Relief Coordination
```

---

# 🧠 System Architecture

```text
                         ┌─────────────────────────┐
                         │       ASHRAYSETU        │
                         │       PWA CLIENT        │
                         └────────────┬────────────┘
                                      │
                 ┌────────────────────┼────────────────────┐
                 │                    │                    │
                 ▼                    ▼                    ▼
        ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
        │ Evacuee Intake │   │ QR Verification│   │ GIS Mapping    │
        │ & Medical      │   │ & Admission     │   │ & Proximity    │
        │ Triage         │   │                 │   │                │
        └───────┬────────┘   └───────┬────────┘   └───────┬────────┘
                │                    │                    │
                └────────────────────┼────────────────────┘
                                     ▼
                          ┌──────────────────────┐
                          │   IndexedDB / Dexie  │
                          │   Local Persistence   │
                          └──────────┬───────────┘
                                     │
                              Offline Queue
                                     │
                         ┌───────────▼───────────┐
                         │ Connectivity Returns  │
                         └───────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │ Synchronization Layer │
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │    Backend / Server   │
                          └──────────┬───────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
                  ▼                  ▼                  ▼
          ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
          │ Command Desk │   │ Inventory    │   │ Emergency    │
          │ Dashboard    │   │ Monitoring   │   │ Dispatch     │
          └──────────────┘   └──────────────┘   └──────────────┘
```

---

# 🔄 End-to-End Data Flow

```text
                FIELD VOLUNTEER
                      │
                      ▼
              Register Household
                      │
                      ▼
             Medical Vulnerability
                   Triage
                      │
                      ▼
                Generate QR
                      │
                      ▼
              Evacuee reaches
                 shelter
                      │
                      ▼
               QR Verification
                      │
                      ▼
             Confirm Admission
                      │
                      ▼
              Update Headcount
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
     Inventory                Medical Queue
      Update                      │
          │                       │
          └───────────┬───────────┘
                      ▼
              District Dashboard
                      │
                      ▼
              Critical Shortage?
                 │           │
                NO          YES
                 │           │
                 │           ▼
                 │    Emergency Dispatch
                 │
                 └───────────────┐
                                 ▼
                         Connectivity Restored
                                 │
                                 ▼
                         Synchronize Data
```

---

# 🧩 Module Architecture

## M1 — Role & Authentication Gateway

Provides application entry and role-oriented access for:

* Field volunteers
* Shelter operators
* District authorities

---

## M2 — Evacuee Intake & Triage Engine

Responsible for:

* Household registration
* Demographic information
* Vulnerability identification
* Medical triage
* Special-needs tracking

---

## M3 — QR Token & Verification Subsystem

Responsible for:

* QR generation
* Digital pass rendering
* Camera-based QR scanning
* Token verification
* Shelter admission

---

## M4 — Shelter Inventory & Resource Ledger

Responsible for:

* Resource quantities
* Consumption calculations
* Supply-hour estimation
* Threshold monitoring
* Replenishment alerts

---

## M5 — Offline Storage & Sync Engine

Responsible for:

* IndexedDB persistence
* Local mutations
* Offline operation
* Synchronization queues
* Batch synchronization

---

## M6 — Spatial Mapping & Proximity Subsystem

Responsible for:

* Shelter mapping
* Distance calculation
* Geographic visualization
* Coastal buffer visualization
* Nearest-shelter analysis

---

## M7 — District Command Desk

Responsible for:

* District-level monitoring
* Shelter occupancy
* Capacity visualization
* Medical triage visibility
* Operational oversight

---

## M8 — Emergency Dispatch

Responsible for:

* Critical inventory detection
* Relief escalation
* Telegram emergency broadcast preparation
* Emergency resource coordination

---

# 🛠️ Technology Stack

| Layer            | Technology                  |
| ---------------- | --------------------------- |
| Framework        | Next.js 14                  |
| Architecture     | App Router                  |
| Language         | TypeScript                  |
| UI               | React                       |
| Styling          | Tailwind CSS                |
| Local Database   | IndexedDB                   |
| Database Wrapper | Dexie.js                    |
| Maps             | Leaflet                     |
| React Maps       | React Leaflet               |
| GIS Calculations | Turf.js                     |
| QR Generation    | qrcode                      |
| QR Scanning      | html5-qrcode                |
| Icons            | Lucide React                |
| Application Type | Progressive Web Application |

---

# 📁 Project Structure

```text
AshraySetu/
│
├── .github/
│   └── workflows/
│
├── backend/
│   └── ...
│
├── docs/
│   └── ...
│
├── freellmapi/
│   └── ...
│
├── frontend/
│   └── ...
│
├── web/
│   └── ...
│
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

> The repository contains separate application and supporting directories. Refer to each directory's implementation for the latest internal structure.

---

# 🚀 Getting Started

## Prerequisites

Install:

* **Node.js**
* **npm**
* A modern web browser

Recommended:

```text
Node.js 18+
npm 9+
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/Alpha-Hawks/AshraySetu.git
```

Navigate into the project:

```bash
cd AshraySetu
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Start Development Server

```bash
npm run dev
```

The application should become available at:

```text
http://localhost:3000
```

---

## 4. Build for Production

```bash
npm run build
```

---

## 5. Start Production Server

```bash
npm start
```

---

# 🧪 Evaluator Demonstration

AshraySetu includes an evaluator-oriented workflow for demonstrating its core disaster-management capabilities.

## Step 1 — Launch the Application

Open:

```text
http://localhost:3000
```

Use:

```text
Load Evaluator Demo Seed
```

to populate demonstration data.

---

## Step 2 — Simulate Network Failure

Use the application's:

```text
✈️ Flight Mode: OFF
```

control to simulate offline operation.

Alternatively, enable airplane mode on a mobile device.

The interface should indicate that local storage is active.

---

## Step 3 — Register an Evacuee

Navigate to:

```text
/intake
```

Example demonstration household:

```text
Head of Household: Pravat Nayak
Hamlet: Talachua
Ward: 4
Members: 5
Infants: 1
Medical Flag: Pregnant
Triage: P1 Critical
```

Select:

```text
Register & Generate QR Token Pass
```

The QR pass is generated locally.

---

## Step 4 — Verify at Shelter

Navigate to:

```text
/scan
```

Use the demonstration QR workflow.

Confirm:

```text
Shelter Admission
```

The shelter headcount updates in local storage.

---

## Step 5 — Inspect Inventory

Navigate to:

```text
/inventory
```

Observe the effect of additional shelter occupancy on estimated resource availability.

Resources approaching the documented threshold are highlighted for replenishment.

---

## Step 6 — Reconnect

Disable simulated flight mode.

Navigate to:

```text
/dashboard
```

The dashboard can then reflect the reconciled operational state and display:

* Updated shelter headcount
* Critical medical triage cases
* Inventory conditions
* Emergency dispatch actions

---

# 📱 Designed for Field Operations

AshraySetu is designed with disaster-field conditions in mind.

### Interface principles

* High contrast
* Touch-friendly controls
* Large interaction targets
* Minimal data-entry friction
* Bilingual interface support
* Offline persistence
* Clear operational status indicators
* Immediate local updates

The goal is to minimize dependence on stable connectivity during evacuation operations.

---

# 🌐 Offline-First Design

Traditional architecture:

```text
User
  │
  ▼
Internet
  │
  ▼
Server
  │
  ▼
Database
```

If the network fails:

```text
❌ Application becomes dependent on connectivity
```

AshraySetu:

```text
User
  │
  ▼
PWA
  │
  ├───────────────┐
  ▼               ▼
Local DB       Server
  │               │
  │               │
  └──── Sync ─────┘
```

This allows local operations to continue while connectivity is unavailable.

---

# 🔐 Data & Security Considerations

Disaster-management systems can handle sensitive information.

AshraySetu should therefore be deployed with appropriate safeguards, including:

* HTTPS in production
* Secure authentication
* Server-side authorization
* Input validation
* Controlled administrative access
* Secure environment variables
* Protection of personally identifiable information
* Appropriate retention policies
* Audit logging for sensitive operations

> The repository's documented offline architecture should not be interpreted as making stored data automatically secure. Browser-local data requires appropriate device and deployment security controls.

---

# 📊 Operational Scenario

### Before Connectivity Loss

```text
Internet Available
       │
       ▼
Register Evacuees
       │
       ▼
Generate QR Passes
       │
       ▼
Synchronize Data
```

### During Connectivity Loss

```text
Network Unavailable
       │
       ▼
Continue Registration
       │
       ▼
Generate QR Pass
       │
       ▼
Scan QR
       │
       ▼
Admit Evacuee
       │
       ▼
Update Local Shelter Data
       │
       ▼
Track Inventory
```

### After Connectivity Returns

```text
Connectivity Restored
       │
       ▼
Pending Mutations
       │
       ▼
Synchronization
       │
       ▼
Reconciled State
       │
       ▼
District Command Desk
```

---

# 🎯 Use Cases

AshraySetu is designed for scenarios including:

### Cyclone Evacuation

Register households and track shelter admissions during cyclone evacuation.

### Shelter Management

Monitor occupancy and essential resource availability.

### Medical Triage

Identify vulnerable evacuees requiring priority attention.

### Offline Field Operations

Continue essential data collection when network connectivity is unavailable.

### District Coordination

Provide authorities with a consolidated operational view.

### Emergency Resource Escalation

Identify critical shelter shortages and initiate relief dispatch workflows.

---

# 🧪 Testing Scenarios

The following scenarios can be used to validate the core system:

### Scenario 1 — Offline Registration

```text
1. Enable offline mode
2. Register household
3. Generate QR
4. Verify local persistence
```

### Scenario 2 — Offline Shelter Admission

```text
1. Open scanner
2. Scan QR
3. Verify household
4. Confirm admission
5. Check shelter headcount
```

### Scenario 3 — Inventory Depletion

```text
1. Register additional evacuees
2. Confirm shelter admission
3. Open inventory
4. Observe resource-hour changes
5. Verify threshold warning
```

### Scenario 4 — Synchronization

```text
1. Perform operations offline
2. Restore connectivity
3. Trigger synchronization
4. Open district dashboard
5. Verify reconciled state
```

---

# 🗺️ Geographic Scope

The current project documentation focuses on **Kendrapara District, Odisha**.

The GIS demonstration includes coastal shelter scenarios around:

* **Rajnagar**
* **Mahakalapada**

The architecture can be extended to additional districts and shelter networks by supplying appropriate geographic and operational datasets.

---

# 🔮 Future Enhancements

Potential extensions include:

* 📲 Dedicated Android field application
* 🛰️ Satellite/weather-data integration
* 🌧️ Live cyclone and rainfall feeds
* 📡 Mesh-network synchronization
* 🔔 Push notifications
* 🗣️ Voice-assisted field data entry
* 🌐 Expanded multilingual support
* 🏥 Hospital coordination
* 🚑 Ambulance coordination
* 📍 Dynamic evacuation routing
* 🧭 Advanced hazard-layer visualization
* 📊 Historical disaster analytics
* 🧾 Comprehensive audit trails
* 🔐 Advanced role-based access control
* 📴 Improved multi-device offline synchronization
* 🏛️ Integration with authorized government disaster-management systems

---

# 🏆 Why AshraySetu?

AshraySetu is built around a simple operational principle:

> **Disaster-management software must remain useful precisely when normal infrastructure becomes unreliable.**

Instead of treating connectivity as a prerequisite, AshraySetu treats connectivity as a synchronization opportunity.

This allows the platform to prioritize:

```text
LOCAL OPERATION
      ↓
CONTINUOUS DATA COLLECTION
      ↓
OFFLINE PERSISTENCE
      ↓
CONNECTIVITY-AWARE SYNC
      ↓
DISTRICT VISIBILITY
```

---

# 👥 Team

## Alpha-Hawks

**Project:** AshraySetu
**Domain:** Disaster Management
**Focus:** Cyclone Evacuation & Shelter Operations
**Geographic Focus:** Coastal Odisha

---

# 📚 Documentation

Project documentation is available in:

```text
/docs
```

Additional implementation resources can be found within the repository's application directories.

---

# 🌐 Project Links

### Repository

**GitHub:**
https://github.com/Alpha-Hawks/AshraySetu

### Live Application

**AshraySetu:**
https://ashray-setu.vercel.app/

---

# 🤝 Contributing

Contributions are welcome.

### Recommended workflow

```bash
# Fork the repository

# Clone your fork
git clone https://github.com/<your-username>/AshraySetu.git

# Create a feature branch
git checkout -b feature/your-feature

# Install dependencies
npm install

# Run locally
npm run dev
```

After implementing and testing your changes:

```bash
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

Then open a Pull Request.

### Contribution guidelines

Please:

* Keep changes focused
* Follow the existing project structure
* Avoid committing secrets
* Test offline functionality where relevant
* Test QR generation/scanning changes
* Test synchronization behavior
* Document significant architectural changes

---

# 🐛 Issues & Feature Requests

If you encounter a bug or have an improvement idea, open an issue in the GitHub repository.

When reporting a bug, include:

```text
Environment:
Browser:
Operating System:
Steps to Reproduce:
Expected Behavior:
Actual Behavior:
Screenshots / Logs:
```

---

# 📄 License

This repository currently does not expose a dedicated license file in the repository root.

Before distributing, modifying, or commercially deploying the project, add an explicit `LICENSE` file defining the permitted usage.

---

# ❤️ Built for Resilience

**AshraySetu — आश्रय सेतु**

### A digital bridge between evacuation, shelter, and coordinated disaster response.

```text
┌──────────────────────────────────────────┐
│                                          │
│              ASHRAYSETU                  │
│                                          │
│       Evacuate • Protect • Coordinate   │
│                                          │
│          Offline When Needed             │
│          Connected When Possible         │
│                                          │
└──────────────────────────────────────────┘
```

**Built by Alpha-Hawks for disaster-management innovation.**
