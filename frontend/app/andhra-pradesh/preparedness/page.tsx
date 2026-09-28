"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardList,
  ArrowLeft,
  Home,
  Sprout,
  Fish,
  GraduationCap,
  HeartPulse,
  Users2,
  Square,
  CheckSquare,
  Printer,
  Info,
  AlertTriangle,
} from "lucide-react";
import { translations, type Language } from "@/lib/locales/translations";

type RoleId = "resident" | "farmer" | "fishermen" | "institution" | "vulnerable" | "volunteer";
type PhaseId = "before" | "during" | "after";

interface ChecklistItem {
  id: string;
  role: RoleId;
  phase: PhaseId;
  text: string;
  detail: string;
  isUrgent?: boolean;
}

const CHECKLIST_DATA: ChecklistItem[] = [
  // 1. Coastal Resident
  {
    id: "res_b1",
    role: "resident",
    phase: "before",
    text: "Inspect and reinforce roof, doors, and window shutters",
    detail: "Fasten loose asbestos sheets with J-bolts, trim dangling tree branches within 5m of house walls.",
  },
  {
    id: "res_b2",
    role: "resident",
    phase: "before",
    text: "Pack essential identity documents in waterproof sealed pouches",
    detail: "Aadhaar cards, ration cards, land records, passbooks, and insurance documents.",
    isUrgent: true,
  },
  {
    id: "res_b3",
    role: "resident",
    phase: "before",
    text: "Store 3 days potable water and non-perishable dry rations",
    detail: "Minimum 15 liters per person in capped jerrycans, plus beaten rice (chuda), jaggery, and biscuits.",
  },
  {
    id: "res_b4",
    role: "resident",
    phase: "before",
    text: "Charge mobile devices, flashlights, and portable power banks",
    detail: "Grid power will be preemptively disconnected by DISCOM when wind speeds touch 60 km/h.",
  },
  {
    id: "res_d1",
    role: "resident",
    phase: "during",
    text: "Stay indoors in the strongest reinforced room away from windows",
    detail: "Keep internal doors closed to minimize cross-ventilation uplift forces.",
  },
  {
    id: "res_d2",
    role: "resident",
    phase: "during",
    text: "Switch off main electrical breakers and gas cylinder regulator",
    detail: "Prevents short-circuit fires and hazardous gas leaks during structural vibrations.",
    isUrgent: true,
  },
  {
    id: "res_d3",
    role: "resident",
    phase: "during",
    text: "DO NOT venture outside during the calm 'Eye' of the storm",
    detail: "The eye lull lasts 20-45 minutes, immediately followed by violent reverse gales from the opposite direction.",
    isUrgent: true,
  },
  {
    id: "res_a1",
    role: "resident",
    phase: "after",
    text: "Boil or chlorinate all drinking water prior to consumption",
    detail: "Floodwaters contaminate shallow borewells and open ponds with sewage pathogens.",
    isUrgent: true,
  },
  {
    id: "res_a2",
    role: "resident",
    phase: "after",
    text: "Watch out for downed live power lines and displaced reptiles",
    detail: "Assume all fallen cables are energized until cleared by linemen. Snakes seek refuge on elevated mounds.",
  },

  // 2. Farmers
  {
    id: "farm_b1",
    role: "farmer",
    phase: "before",
    text: "Open and clear field drainage outlets and farm field bunds",
    detail: "Prevents standing water accumulation and soil siltation in low-lying delta paddy fields.",
  },
  {
    id: "farm_b2",
    role: "farmer",
    phase: "before",
    text: "Harvest mature kharif/rabi crops and horticulture early",
    detail: "Harvest crops at 80% physiological maturity to minimize 100% loss from high winds and lodging.",
  },
  {
    id: "farm_b3",
    role: "farmer",
    phase: "before",
    text: "Shift livestock and cattle to elevated pucca shelters / mounds",
    detail: "Do not leave cattle tied to pegs; untie tether ropes so animals can flee rising floodwaters.",
    isUrgent: true,
  },
  {
    id: "farm_d1",
    role: "farmer",
    phase: "during",
    text: "Keep grain reserves stored on elevated bamboo racks with tarpaulins",
    detail: "Store harvested grains at least 1.5m above expected floor level in waterproof polythene wraps.",
  },
  {
    id: "farm_a1",
    role: "farmer",
    phase: "after",
    text: "Drain submerged paddy fields within 24–48 hours to salvage plants",
    detail: "Paddy can survive 48-72 hours submerged; immediate drainage prevents root rot and germination in panicle.",
  },
  {
    id: "farm_a2",
    role: "farmer",
    phase: "after",
    text: "Flush saline-inundated fields with fresh canal water and apply gypsum",
    detail: "Neutralizes sodium ions deposited by storm surge inundation, restoring delta soil fertility.",
  },

  // 3. Fishermen & Aquaculture
  {
    id: "fish_b1",
    role: "fishermen",
    phase: "before",
    text: "Tow boats and country craft at least 100m inland beyond high-tide line",
    detail: "Anchor crafts to concrete pillars or mature coconut trunks using heavy nylon braided hawser ropes.",
  },
  {
    id: "fish_b2",
    role: "fishermen",
    phase: "before",
    text: "Erect protective bird/surge netting around coastal shrimp & fish ponds",
    detail: "Secure pond embankments with sandbags to prevent cultured stock overflow into tidal creeks.",
  },
  {
    id: "fish_b3",
    role: "fishermen",
    phase: "before",
    text: "Dismantle paddle aerators and secure solar electrical converters",
    detail: "Prevent expensive aerator machinery loss from wind shear and salt spray corrosion.",
  },
  {
    id: "fish_d1",
    role: "fishermen",
    phase: "during",
    text: "Maintain continuous radio watch on Marine VHF Channel 16",
    detail: "Channel 16 is monitored 24/7 by Coastal Security Police and Coast Guard Maritime Rescue.",
  },
  {
    id: "fish_a1",
    role: "fishermen",
    phase: "after",
    text: "Do not launch boats until port warning signals are officially lowered",
    detail: "Wait until Local Cautionary (LC-III) or Danger signals (Great Danger Signal 8-10) are withdrawn.",
    isUrgent: true,
  },

  // 4. Schools & Public Institutions
  {
    id: "inst_b1",
    role: "institution",
    phase: "before",
    text: "Designate clean dry classrooms as emergency shelter wards",
    detail: "Segregate spaces for families, women/infants, and medical triage station.",
  },
  {
    id: "inst_b2",
    role: "institution",
    phase: "before",
    text: "Inspect diesel generator, fuel reserves, and overhead water tanks",
    detail: "Ensure minimum 500 liters clean water stored and 48 hours generator fuel on hand.",
  },
  {
    id: "inst_d1",
    role: "institution",
    phase: "during",
    text: "Maintain intake register and assign digital QR passes to evacuee heads",
    detail: "Use AshraySetu offline intake system to record headcount and vulnerability tags.",
  },
  {
    id: "inst_a1",
    role: "institution",
    phase: "after",
    text: "Disinfect washrooms and common dining halls with bleaching powder",
    detail: "Prevents acute diarrheal outbreaks and vector-borne infections in dense shelter settings.",
  },

  // 5. Vulnerable Groups (Elderly, Disabled, Pregnant)
  {
    id: "vuln_b1",
    role: "vulnerable",
    phase: "before",
    text: "Collect 14-day supply of essential chronic prescription medications",
    detail: "Insulin, hypertension drugs, inhalers, dialysis supplies, or prenatal iron/folate supplements.",
    isUrgent: true,
  },
  {
    id: "vuln_b2",
    role: "vulnerable",
    phase: "before",
    text: "Coordinate early pre-landfall evacuation transport with ASHA/ANM",
    detail: "High-risk pregnant mothers (third trimester) shifted to Community Health Centres (CHC) 36 hours prior.",
    isUrgent: true,
  },
  {
    id: "vuln_d1",
    role: "vulnerable",
    phase: "during",
    text: "Keep orthopedic aids, wheelchair, or walking stick within arm's reach",
    detail: "Ensure emergency contact card with blood group and allergies is pinned to clothing.",
  },
  {
    id: "vuln_a1",
    role: "vulnerable",
    phase: "after",
    text: "Request medical team assessment prior to returning to damaged homes",
    detail: "Ensure basic mobility paths and sanitization are confirmed safe before home re-entry.",
  },

  // 6. Community Volunteers & Civil Defense
  {
    id: "vol_b1",
    role: "volunteer",
    phase: "before",
    text: "Test amateur ham radio sets, satellite phones, and loudhailers",
    detail: "Establish relay protocols between Gram Panchayat, Mandal Revenue Office, and DEOC (1077).",
  },
  {
    id: "vol_b2",
    role: "volunteer",
    phase: "before",
    text: "Survey low-lying coastal hamlets and guide reluctant residents to shelters",
    detail: "Prioritize thatched roof dwellers and mud huts located within 1.5km of high-tide line.",
  },
  {
    id: "vol_d1",
    role: "volunteer",
    phase: "during",
    text: "Manage community kitchen and monitor clean drinking water distribution",
    detail: "Ensure hot khichdi/boiled rice prepared with chlorinated water; enforce hygiene standards.",
  },
  {
    id: "vol_a1",
    role: "volunteer",
    phase: "after",
    text: "Deploy road clearance squads with power chain-saws to clear fallen trees",
    detail: "Clear arterial routes to allow ambulances and relief convoys access to village centres.",
  },
];

export default function PreparednessPage() {
  const [lang, setLang] = useState<Language>("en");
  const [activeRole, setActiveRole] = useState<RoleId>("resident");
  const [activePhase, setActivePhase] = useState<PhaseId>("before");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ap_prep_checklist");
      if (saved) setCheckedItems(JSON.parse(saved));
    } catch {
      // Ignore
    }

    const handleLang = () => {
      const savedLang = localStorage.getItem("ashraysetu_lang") as Language;
      if (savedLang) setLang(savedLang);
    };
    handleLang();
    window.addEventListener("languageChanged", handleLang);
    return () => window.removeEventListener("languageChanged", handleLang);
  }, []);

  const t = translations[lang];

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("ap_prep_checklist", JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const roles = [
    { id: "resident" as RoleId, label: "Coastal Resident", icon: Home },
    { id: "farmer" as RoleId, label: "Farmers & Agriculture", icon: Sprout },
    { id: "fishermen" as RoleId, label: "Fishermen & Aqua", icon: Fish },
    { id: "institution" as RoleId, label: "Schools & Shelters", icon: GraduationCap },
    { id: "vulnerable" as RoleId, label: "Elderly & Vulnerable", icon: HeartPulse },
    { id: "volunteer" as RoleId, label: "Volunteers & Relief", icon: Users2 },
  ];

  const phases = [
    { id: "before" as PhaseId, label: "Before Cyclone (72h – 24h)" },
    { id: "during" as PhaseId, label: "During Landfall (0h – 12h)" },
    { id: "after" as PhaseId, label: "After Landfall & Recovery" },
  ];

  const currentItems = CHECKLIST_DATA.filter(
    (item) => item.role === activeRole && item.phase === activePhase
  );

  const totalRoleItems = CHECKLIST_DATA.filter((item) => item.role === activeRole);
  const completedRoleItems = totalRoleItems.filter((item) => checkedItems[item.id]).length;
  const progressPercent = totalRoleItems.length
    ? Math.round((completedRoleItems / totalRoleItems.length) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/andhra-pradesh"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold mb-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Andhra Pradesh Overview</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {t.prepTitle}
              </h1>
              <p className="text-xs text-slate-400">
                APSDMA / NDMA Certified Role-Specific Before, During, and After Action Protocols
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Checklist</span>
          </button>
        </div>
      </div>

      {/* Role Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {roles.map((r) => {
          const Icon = r.icon;
          const isActive = activeRole === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setActiveRole(r.id)}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between space-y-2 ${
                isActive
                  ? "bg-emerald-950/40 border-emerald-500/60 shadow-lg text-white"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
              <div>
                <div className="text-xs font-bold leading-tight">{r.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress & Phase Selector Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Preparedness Verification
            </span>
            <h2 className="text-base font-bold text-white mt-0.5">
              Role: {roles.find((r) => r.id === activeRole)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-32 bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {progressPercent}% Complete ({completedRoleItems}/{totalRoleItems.length})
            </span>
          </div>
        </div>

        {/* Phase Pill Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          {phases.map((p) => {
            const isPhaseActive = activePhase === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePhase(p.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  isPhaseActive
                    ? "bg-slate-100 text-slate-950 font-bold shadow-md"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Checklist Items Container */}
      <div className="space-y-3">
        {currentItems.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            No specific items recorded for this phase.
          </div>
        ) : (
          currentItems.map((item) => {
            const isChecked = !!checkedItems[item.id];
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 select-none ${
                  isChecked
                    ? "bg-emerald-950/20 border-emerald-500/50 shadow-sm"
                    : "bg-slate-900 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="mt-0.5">
                  {isChecked ? (
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-500" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isChecked ? "text-slate-100 line-through opacity-80" : "text-white"
                      }`}
                    >
                      {item.text}
                    </span>
                    {item.isUrgent && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        CRITICAL SAFETY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Institutional Reference Footer */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Grounded Protocol Standards:</strong> These checklists adhere to the National Disaster Management Guidelines: Management of Cyclones (NDMA) and Andhra Pradesh State Disaster Management Plan (APSDMP 2020-2030).
        </div>
      </div>
    </div>
  );
}
