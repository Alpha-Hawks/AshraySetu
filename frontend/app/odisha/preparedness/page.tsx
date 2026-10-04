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
  ShieldCheck,
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

const ODISHA_CHECKLIST_DATA: ChecklistItem[] = [
  // 1. Coastal Resident
  {
    id: "res_b1",
    role: "resident",
    phase: "before",
    text: "Inspect and reinforce thatched roof, asbestos sheets, and window shutters",
    detail: "Fasten loose asbestos sheets with J-bolts, trim dangling tree branches within 5m of house walls.",
  },
  {
    id: "res_b2",
    role: "resident",
    phase: "before",
    text: "Pack essential identity documents in waterproof sealed polythene pouches",
    detail: "Aadhaar cards, ration cards, land pattas, bank passbooks, and insurance documents.",
    isUrgent: true,
  },
  {
    id: "res_b3",
    role: "resident",
    phase: "before",
    text: "Store 3 days potable water and non-perishable dry rations",
    detail: "Minimum 15 liters per person in capped jerrycans, plus flattened rice (chuda), jaggery (gur), and biscuits.",
  },
  {
    id: "res_b4",
    role: "resident",
    phase: "before",
    text: "Identify your nearest designated Multipurpose Cyclone Shelter (MCS)",
    detail: "Confirm the designated shelter building with your Gram Panchayat Ward Member or Aapda Mitra volunteer.",
    isUrgent: true,
  },
  {
    id: "res_d1",
    role: "resident",
    phase: "during",
    text: "Turn off the main electrical breaker switch and disconnect LPG gas cylinder",
    detail: "Prevents short-circuit fires and hazardous gas leaks during severe wind-induced structural shocks.",
    isUrgent: true,
  },
  {
    id: "res_d2",
    role: "resident",
    phase: "during",
    text: "Do NOT step outside during the calm 'Eye of the Cyclone'",
    detail: "A sudden deceptive lull lasts 20-40 minutes before violent counter-directional hurricane winds resume immediately.",
    isUrgent: true,
  },
  {
    id: "res_d3",
    role: "resident",
    phase: "during",
    text: "Stay in the safest interior reinforced room away from exterior glass panes",
    detail: "Stay under strong tables or beds if structural creaking or roof uplift is detected.",
  },
  {
    id: "res_a1",
    role: "resident",
    phase: "after",
    text: "Boil all drinking water for minimum 10 minutes or use halogen chlorine tablets",
    detail: "Cyclone floodings cause acute cross-contamination of tube-wells and open water bodies with cholera/diarrhea pathogens.",
    isUrgent: true,
  },
  {
    id: "res_a2",
    role: "resident",
    phase: "after",
    text: "Beware of snapped power lines and venomous snake bites in debris",
    detail: "Do not touch standing pools of water near downed electric poles; probe debris with long wooden poles.",
  },

  // 2. Farmer / Agriculture
  {
    id: "far_b1",
    role: "farmer",
    phase: "before",
    text: "Advance harvest of mature standing crops (paddy, sugarcane, vegetables)",
    detail: "Store harvested grains on elevated platforms inside pucca storage structures or Multipurpose Cyclone Shelters.",
    isUrgent: true,
  },
  {
    id: "far_b2",
    role: "farmer",
    phase: "before",
    text: "Dig drainage trenches to evacuate excess floodwater from crop fields",
    detail: "Clear weeds from field perimeter drainage ditches to minimize saline and freshwater waterlogging.",
  },
  {
    id: "far_b3",
    role: "farmer",
    phase: "before",
    text: "Untie livestock from ropes and move cattle to elevated community animal shelters",
    detail: "Tied cattle drown in storm surges. Move cattle to elevated Goshala/kalyan mandaps at least 24 hours prior to landfall.",
    isUrgent: true,
  },
  {
    id: "far_d1",
    role: "farmer",
    phase: "during",
    text: "Do not attempt to rescue stray cattle in open fields during active cyclone gale",
    detail: "Flying debris, corrugated sheet missiles, and lightning are lethal in open agricultural areas.",
  },
  {
    id: "far_a1",
    role: "farmer",
    phase: "after",
    text: "Drain saline floodwaters rapidly to prevent persistent soil salinization",
    detail: "Flush standing water with freshwater channels to preserve soil quality for rabi season sowing.",
  },
  {
    id: "far_a2",
    role: "farmer",
    phase: "after",
    text: "Vaccinate surviving livestock against hemorrhagic septicemia and black quarter",
    detail: "Contact nearest Mobile Veterinary Unit (MVU) or Block Veterinary Officer within 48 hours.",
  },

  // 3. Fishermen
  {
    id: "fsh_b1",
    role: "fishermen",
    phase: "before",
    text: "Heed IMD Red Coastal Alerts: Zero deep sea or coastal fishing sorties",
    detail: "Return all offshore trawlers to nearest safe harbor (Paradip, Dhamra, Astrang, Gopalpur) immediately.",
    isUrgent: true,
  },
  {
    id: "fsh_b2",
    role: "fishermen",
    phase: "before",
    text: "Haul motorized and non-motorized crafts far above high spring-tide line",
    detail: "Anchor crafts to deep concrete ground pylons with double-braided nylon marine ropes; remove outboard motors (OBMs).",
    isUrgent: true,
  },
  {
    id: "fsh_d1",
    role: "fishermen",
    phase: "during",
    text: "Maintain continuous radio monitoring on marine VHF Channel 16",
    detail: "Follow Coast Guard / Marine Police broadcast instructions for storm surge status.",
  },
  {
    id: "fsh_a1",
    role: "fishermen",
    phase: "after",
    text: "Inspect hull structural integrity and bilge clearance before re-launching",
    detail: "Do not enter sea until official 'All Clear' bulletin is issued by Fisheries Department & OSDMA.",
  },

  // 4. Schools & Institutions
  {
    id: "ins_b1",
    role: "institution",
    phase: "before",
    text: "Sanitize and open designated school cyclone shelter halls",
    detail: "Unlock emergency sanitation toilets, verify overhead syntax water tank storage, and check backup DG generator sets.",
    isUrgent: true,
  },
  {
    id: "ins_b2",
    role: "institution",
    phase: "before",
    text: "Store emergency dry food, candles, solar lanterns, and ORS packets",
    detail: "Coordinate with Tahsildar / BDO relief wing to stock minimum 5 days supply for projected evacuees.",
  },
  {
    id: "ins_d1",
    role: "institution",
    phase: "during",
    text: "Enforce strict headcount muster roll and register every arriving evacuee",
    detail: "Use AshraySetu Intake module to record family headcounts, infants, pregnant mothers, and P1 medical cases.",
  },
  {
    id: "ins_a1",
    role: "institution",
    phase: "after",
    text: "Disinfect shelter premises with bleaching powder and lime spray",
    detail: "Prevent post-disaster outbreaks of gastroenteritis or vector-borne ailments.",
  },

  // 5. Vulnerable Groups (Elderly / Pregnant / Disabled)
  {
    id: "vul_b1",
    role: "vulnerable",
    phase: "before",
    text: "Pre-evacuate pregnant women (3rd trimester) to Community Health Centres (CHC)",
    detail: "Maa Gruha (Maternity Waiting Homes) ensure safe delivery access before road bridges become submerged.",
    isUrgent: true,
  },
  {
    id: "vul_b2",
    role: "vulnerable",
    phase: "before",
    text: "Procure 14-day supply of life-essential prescription medications",
    detail: "Insulin, hypertension pills, cardiac medicines, and inhalers packed in waterproof containers.",
    isUrgent: true,
  },
  {
    id: "vul_d1",
    role: "vulnerable",
    phase: "during",
    text: "Keep mobility aids, wheelchairs, and crutches immediately beside refuge bed",
    detail: "Assigned Aapda Mitra or family member must stay beside bedridden individuals at all times.",
  },
  {
    id: "vul_a1",
    role: "vulnerable",
    phase: "after",
    text: "Immediate medical checkup at shelter clinic for moisture-induced complications",
    detail: "Monitor blood pressure, blood glucose, and hypothermia symptoms with on-duty ASHA/ANM workers.",
  },

  // 6. Community Volunteers & Aapda Mitra
  {
    id: "vol_b1",
    role: "volunteer",
    phase: "before",
    text: "Broadcast early warning sirens and megaphone village announcements",
    detail: "Inform all households in coastal wards of Kendrapara, Jagatsinghpur, Puri, etc., regarding mandatory evacuation.",
    isUrgent: true,
  },
  {
    id: "vol_b2",
    role: "volunteer",
    phase: "before",
    text: "Assist ODRAF & NDRF teams in clearing pre-landfall road bottlenecks",
    detail: "Pre-position mechanical power saws, tree-cutters, and high-capacity portable de-watering pumps.",
  },
  {
    id: "vol_d1",
    role: "volunteer",
    phase: "during",
    text: "Maintain shelter security and manage organized food & water queue lines",
    detail: "Ensure priority ration distribution to mothers with unweaned infants, elderly, and differently-abled individuals.",
  },
  {
    id: "vol_a1",
    role: "volunteer",
    phase: "after",
    text: "Conduct immediate search and rescue (SAR) reconnaissance in cut-off hamlets",
    detail: "Report structural breaches, fallen transmission towers, or stranded citizens to the DEOC Control Room (1077).",
    isUrgent: true,
  },
];

export default function OdishaPreparednessPage() {
  const [lang, setLang] = useState<Language>("en");
  const [selectedRole, setSelectedRole] = useState<RoleId>("resident");
  const [selectedPhase, setSelectedPhase] = useState<PhaseId>("before");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleLang = () => {
      const savedLang = localStorage.getItem("ashraysetu_lang") as Language;
      if (savedLang) setLang(savedLang);
    };
    handleLang();
    window.addEventListener("languageChanged", handleLang);

    try {
      const savedChecks = localStorage.getItem("ashraysetu_odisha_prep_checklist");
      if (savedChecks) {
        setCheckedItems(JSON.parse(savedChecks));
      }
    } catch {
      // Ignore
    }

    return () => window.removeEventListener("languageChanged", handleLang);
  }, []);

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("ashraysetu_odisha_prep_checklist", JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const t = translations[lang];

  const roleMeta: Record<RoleId, { label: string; icon: any; color: string }> = {
    resident: { label: "Coastal Resident", icon: Home, color: "text-teal-400" },
    farmer: { label: "Farmer / Agriculture", icon: Sprout, color: "text-emerald-400" },
    fishermen: { label: "Fishermen & Marine", icon: Fish, color: "text-sky-400" },
    institution: { label: "Shelters & Schools", icon: GraduationCap, color: "text-indigo-400" },
    vulnerable: { label: "Vulnerable / Elderly", icon: HeartPulse, color: "text-rose-400" },
    volunteer: { label: "Aapda Mitra / Volunteer", icon: Users2, color: "text-amber-400" },
  };

  const phaseMeta: Record<PhaseId, { label: string; time: string; badgeColor: string }> = {
    before: {
      label: "Phase 1: Before Cyclone (Alert)",
      time: "T-72h to T-12h Prior to Landfall",
      badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    },
    during: {
      label: "Phase 2: During Landfall (Eye & Gales)",
      time: "T-12h to T+6h Active Cyclone",
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    },
    after: {
      label: "Phase 3: Post-Landfall (Recovery)",
      time: "T+6h to T+72h Rehabilitation",
      badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    },
  };

  const filteredItems = ODISHA_CHECKLIST_DATA.filter(
    (item) => item.role === selectedRole && item.phase === selectedPhase
  );

  const completedInView = filteredItems.filter((i) => checkedItems[i.id]).length;
  const totalInView = filteredItems.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/odisha"
            className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-semibold mb-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Odisha Hub Overview</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {t.odishaPrepTitle}
              </h1>
              <p className="text-xs text-slate-400">
                Official Multi-Sector Preparedness SOPs • Certified by OSDMA (Odisha)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-teal-400" />
          <span>Print / Export Checklist</span>
        </button>
      </div>

      {/* Role Selector Tabs (6 Roles) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {(Object.keys(roleMeta) as RoleId[]).map((rId) => {
          const meta = roleMeta[rId];
          const Icon = meta.icon;
          const isSelected = selectedRole === rId;
          return (
            <button
              key={rId}
              onClick={() => setSelectedRole(rId)}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between space-y-2 transition ${
                isSelected
                  ? "bg-slate-800 border-teal-500 ring-1 ring-teal-500/50 shadow-md"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400"
              }`}
            >
              <Icon className={`w-5 h-5 ${meta.color}`} />
              <div>
                <div className={`text-xs font-bold leading-tight ${isSelected ? "text-white" : "text-slate-300"}`}>
                  {meta.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Phase Selector Tabs (Before / During / After) */}
      <div className="grid sm:grid-cols-3 gap-3">
        {(Object.keys(phaseMeta) as PhaseId[]).map((pId) => {
          const meta = phaseMeta[pId];
          const isSelected = selectedPhase === pId;
          return (
            <button
              key={pId}
              onClick={() => setSelectedPhase(pId)}
              className={`p-4 rounded-2xl border text-left transition shadow-md ${
                isSelected
                  ? "bg-slate-800 border-teal-500 ring-1 ring-teal-500/50"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.badgeColor}`}>
                  {meta.time}
                </span>
                {isSelected && <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />}
              </div>
              <h3 className={`text-sm font-bold mt-2 ${isSelected ? "text-white" : "text-slate-300"}`}>
                {meta.label}
              </h3>
            </button>
          );
        })}
      </div>

      {/* Checklist Tasks List */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{roleMeta[selectedRole].label} Checklist</span>
              <span className="text-xs text-slate-400 font-normal">
                ({phaseMeta[selectedPhase].label})
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Click checkboxes to track offline verified actions on this device
            </p>
          </div>

          <div className="text-xs font-mono">
            <span className="text-slate-400">Progress: </span>
            <span className={`font-bold ${completedInView === totalInView ? "text-emerald-400" : "text-teal-400"}`}>
              {completedInView} of {totalInView} completed
            </span>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No specific checklist actions defined for this combination.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isDone = Boolean(checkedItems[item.id]);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3.5 ${
                    isDone
                      ? "bg-slate-950/70 border-emerald-600/40 text-slate-300"
                      : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-200"
                  }`}
                >
                  <div className="mt-0.5">
                    {isDone ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${isDone ? "line-through text-slate-400" : "text-white"}`}>
                        {item.text}
                      </span>
                      {item.isUrgent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          CRITICAL
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-teal-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Adheres to OSDMA Community Early Warning & Evacuation Standard Operating Procedures</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            AshraySetu v1.2
          </span>
        </div>
      </div>
    </div>
  );
}
