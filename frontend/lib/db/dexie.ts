import Dexie, { type Table } from "dexie";

export interface Shelter {
  id: string; // e.g. 'OD-KEN-RAJ-001' or 'AP-VSP-BHM-001'
  state?: "ODISHA" | "ANDHRA_PRADESH";
  district?: string;
  name: string;
  block_name: string; // Mandal in AP
  gram_panchayat: string;
  capacity_persons: number;
  current_occupancy: number;
  latitude: number;
  longitude: number;
  has_solar_backup: boolean;
  has_borewell: boolean;
  incharge_name: string;
  incharge_phone: string;
  status: "STANDBY" | "ACTIVE" | "SATURATED" | "DAMAGED";
}

export interface Household {
  id: string; // UUIDv4
  shelter_id: string;
  head_name: string;
  hamlet_name: string;
  ward_number: number;
  total_members: number;
  male_count: number;
  female_count: number;
  child_under_five_count: number;
  elderly_above_sixty_count: number;
  livestock_count: number;
  registered_at: number; // epoch ms
  sync_status: "PENDING_SYNC" | "SYNCED" | "CONFLICT";
  qr_created_at?: number;
  qr_scanned_at?: number;
  arrival_duration_seconds?: number;
  status?: string;
}

export interface EvacueeTriage {
  id: string; // UUIDv4
  household_id: string;
  shelter_id: string;
  person_name: string;
  vulnerability_category:
    | "PREGNANT"
    | "INFANT"
    | "ELDERLY_BEDRIDDEN"
    | "DISABLED"
    | "CHRONIC_MED";
  triage_level: "P1_CRITICAL" | "P2_URGENT" | "P3_STANDARD";
  notes?: string;
  created_at: number;
}

export interface InventoryItem {
  id: string; // compound: ${shelter_id}_${item_type}
  shelter_id: string;
  item_type:
    | "WATER_LITRES"
    | "FOOD_PACKETS"
    | "BABY_FORMULA"
    | "ORS_SACHETS"
    | "SANITARY_KITS"
    | "HALOGEN_TABS";
  quantity_available: number;
  daily_burn_rate: number;
  unit: "LITRES" | "PACKETS" | "TINS" | "SACHETS" | "KITS" | "STRIPS";
  last_updated: number;
}

export interface SyncLog {
  id: string; // UUIDv4
  entity_name: "households" | "triage" | "inventory" | "shelters";
  record_id: string;
  operation: "INSERT" | "UPDATE";
  payload: string; // JSON string
  device_id: string;
  client_timestamp: number;
  reconciled: boolean;
}

export interface HistoricalCyclone {
  id: string; // e.g. "AP-CYC-1977-DIVISEEMA"
  cyclone_name: string;
  year: number;
  start_date: string;
  end_date: string;
  landfall_location: string;
  affected_districts: string[];
  maximum_wind_speed_kmh: number | "Data unavailable";
  rainfall_mm: string | "Data unavailable";
  storm_surge_meters: number | "Data unavailable";
  evacuated_population: number | "Data unavailable";
  casualties: number | "Data unavailable";
  houses_damaged: number | "Data unavailable";
  infrastructure_damage: string;
  agricultural_damage: string;
  fisheries_impact: string;
  power_disruption: string;
  communication_disruption: string;
  government_response: string;
  lessons_learned: string;
  source_name: string;
  source_url: string;
  retrieved_at: string;
  last_verified_at: string;
}

export interface ShelterAdmission {
  id: string; // UUID
  shelter_id: string;
  household_token: string; // shortRef or UUID
  head_name: string;
  hamlet_name: string;
  ward_number?: number;
  total_members: number;
  male_count: number;
  female_count: number;
  child_under_five_count: number;
  elderly_above_sixty_count: number;
  livestock_count: number;
  triage_code: string;
  triage_level: string;
  admitted_at: number; // epoch ms
  clinical_notes?: string;
  ration_water_litres?: number;
  ration_food_packets?: number;
  qr_created_at?: number;
  qr_scanned_at?: number;
  arrival_duration_seconds?: number;
  status?: string;
}

export class AshraySetuDatabase extends Dexie {
  shelters!: Table<Shelter, string>;
  households!: Table<Household, string>;
  triage!: Table<EvacueeTriage, string>;
  inventory!: Table<InventoryItem, string>;
  sync_logs!: Table<SyncLog, string>;
  historical_cyclones!: Table<HistoricalCyclone, string>;
  admissions!: Table<ShelterAdmission, string>;

  constructor() {
    super("AshraySetuDB");
    this.version(2).stores({
      shelters: "id, state, district, block_name, gram_panchayat, status",
      households: "id, shelter_id, hamlet_name, registered_at, sync_status",
      triage: "id, household_id, shelter_id, triage_level",
      inventory: "id, shelter_id, item_type",
      sync_logs: "id, entity_name, record_id, reconciled, client_timestamp",
      historical_cyclones: "id, year, cyclone_name",
    });
    this.version(3).stores({
      admissions: "id, shelter_id, household_token, admitted_at, head_name",
    });
  }
}

export const db = new AshraySetuDatabase();

// Master seed data for Kendrapara District coastal shelters
export const ODISHA_SHELTERS: Shelter[] = [
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

// Certified Multipurpose Cyclone Shelters in Coastal Andhra Pradesh (All 12 Coastal Districts)
export const AP_SHELTERS: Shelter[] = [
  {
    id: "AP-SHELTER-VSP-001",
    state: "ANDHRA_PRADESH",
    district: "Visakhapatnam",
    name: "Bheemili Coastal Cyclone Shelter",
    block_name: "Bheemunipatnam",
    gram_panchayat: "Bheemili Beach Road",
    capacity_persons: 700,
    current_occupancy: 150,
    latitude: 17.8924,
    longitude: 83.4542,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "K. Appala Naidu",
    incharge_phone: "9440123401",
    status: "ACTIVE",
  },
  {
    id: "AP-SHELTER-SRK-002",
    state: "ANDHRA_PRADESH",
    district: "Srikakulam",
    name: "Palasa Multipurpose Cyclone Shelter",
    block_name: "Palasa",
    gram_panchayat: "Kasibugga",
    capacity_persons: 600,
    current_occupancy: 110,
    latitude: 18.7692,
    longitude: 84.4124,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "P. Jagannadha Rao",
    incharge_phone: "9440123402",
    status: "ACTIVE",
  },
  {
    id: "AP-SHELTER-BAP-003",
    state: "ANDHRA_PRADESH",
    district: "Bapatla",
    name: "Nizampatnam Port Cyclone Shelter",
    block_name: "Nizampatnam",
    gram_panchayat: "Haripuram",
    capacity_persons: 800,
    current_occupancy: 420,
    latitude: 15.9082,
    longitude: 80.6723,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "Ch. Venkata Subbaiah",
    incharge_phone: "9440123403",
    status: "ACTIVE",
  },
  {
    id: "AP-SHELTER-KRI-004",
    state: "ANDHRA_PRADESH",
    district: "Krishna",
    name: "Machilipatnam Coastal Relief Centre",
    block_name: "Machilipatnam",
    gram_panchayat: "Manginapudi",
    capacity_persons: 900,
    current_occupancy: 310,
    latitude: 16.1824,
    longitude: 81.1421,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "M. Srinivas",
    incharge_phone: "9440123404",
    status: "ACTIVE",
  },
  {
    id: "AP-SHELTER-NEL-005",
    state: "ANDHRA_PRADESH",
    district: "Sri Potti Sriramulu Nellore",
    name: "Krishnapatnam Port Shelter",
    block_name: "Muthukur",
    gram_panchayat: "Gopalapuram",
    capacity_persons: 650,
    current_occupancy: 190,
    latitude: 14.2541,
    longitude: 80.1245,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "G. Prasad",
    incharge_phone: "9440123405",
    status: "ACTIVE",
  },
  {
    id: "AP-SHELTER-KNS-006",
    state: "ANDHRA_PRADESH",
    district: "Dr. B.R. Ambedkar Konaseema",
    name: "Katrenikona Delta Shelter",
    block_name: "Katrenikona",
    gram_panchayat: "Chirrayanam",
    capacity_persons: 550,
    current_occupancy: 140,
    latitude: 16.6214,
    longitude: 82.1542,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "B. Satyanarayana",
    incharge_phone: "9440123406",
    status: "ACTIVE",
  },
  {
    id: "AP-SHELTER-KKD-007",
    state: "ANDHRA_PRADESH",
    district: "Kakinada",
    name: "Kakinada Anchorage Coastal Shelter",
    block_name: "Kakinada Rural",
    gram_panchayat: "Surasaniyanam",
    capacity_persons: 750,
    current_occupancy: 280,
    latitude: 16.9892,
    longitude: 82.2612,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "V. Suryanarayana",
    incharge_phone: "9440123407",
    status: "ACTIVE",
  },
  {
    id: "AP-SHELTER-VZM-008",
    state: "ANDHRA_PRADESH",
    district: "Vizianagaram",
    name: "Bhogapuram Coastal Multi-Hazard Shelter",
    block_name: "Bhogapuram",
    gram_panchayat: "Chintapalli",
    capacity_persons: 500,
    current_occupancy: 130,
    latitude: 18.0214,
    longitude: 83.5124,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "D. Rama Rao",
    incharge_phone: "9440123408",
    status: "ACTIVE",
  },
  {
    id: "AP-SHELTER-ANK-009",
    state: "ANDHRA_PRADESH",
    district: "Anakapalli",
    name: "Rambilli Coastal Defense Shelter",
    block_name: "Rambilli",
    gram_panchayat: "Dimili Beach",
    capacity_persons: 600,
    current_occupancy: 220,
    latitude: 17.5124,
    longitude: 83.0214,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "K. Satyam",
    incharge_phone: "9440123409",
    status: "ACTIVE",
  },
  {
    id: "AP-SHELTER-WGD-010",
    state: "ANDHRA_PRADESH",
    district: "West Godavari",
    name: "Narsapur River Mouth Cyclone Shelter",
    block_name: "Narsapur",
    gram_panchayat: "Perupalem Beach",
    capacity_persons: 650,
    current_occupancy: 170,
    latitude: 16.4214,
    longitude: 81.7124,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "T. Krishna Murthy",
    incharge_phone: "9440123410",
    status: "ACTIVE",
  },
  {
    id: "AP-SHELTER-PKM-011",
    state: "ANDHRA_PRADESH",
    district: "Prakasam",
    name: "Kothapatnam Coastal Refuge Center",
    block_name: "Kothapatnam",
    gram_panchayat: "Kothapatnam Sea Coast",
    capacity_persons: 700,
    current_occupancy: 260,
    latitude: 15.4812,
    longitude: 80.1424,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "P. Venkaiah",
    incharge_phone: "9440123411",
    status: "ACTIVE",
  },
  {
    id: "AP-SHELTER-TRP-012",
    state: "ANDHRA_PRADESH",
    district: "Tirupati",
    name: "Dugarajapatnam Marine Cyclone Shelter",
    block_name: "Vakadu",
    gram_panchayat: "Dugarajapatnam",
    capacity_persons: 550,
    current_occupancy: 180,
    latitude: 14.0124,
    longitude: 80.1542,
    has_solar_backup: true,
    has_borewell: true,
    incharge_name: "S. Muniswamy",
    incharge_phone: "9440123412",
    status: "ACTIVE",
  },
];

export const INITIAL_SHELTERS: Shelter[] = [...ODISHA_SHELTERS, ...AP_SHELTERS];

export async function initializeDatabase() {
  // Upsert all official shelters (ensures both Odisha and AP shelters exist even if previously seeded)
  await db.shelters.bulkPut(INITIAL_SHELTERS);

  // Seed inventory for any shelters that don't have commodities yet
  const existingInv = await db.inventory.toArray();
  const existingInvShelterIds = new Set(existingInv.map((i) => i.shelter_id));
  const newInventorySeed: InventoryItem[] = [];

  for (const shelter of INITIAL_SHELTERS) {
    if (!existingInvShelterIds.has(shelter.id)) {
      newInventorySeed.push(
        {
          id: `${shelter.id}_WATER_LITRES`,
          shelter_id: shelter.id,
          item_type: "WATER_LITRES",
          quantity_available: Math.floor(shelter.capacity_persons * 3.5),
          daily_burn_rate: shelter.current_occupancy * 3.0,
          unit: "LITRES",
          last_updated: Date.now(),
        },
        {
          id: `${shelter.id}_FOOD_PACKETS`,
          shelter_id: shelter.id,
          item_type: "FOOD_PACKETS",
          quantity_available: Math.floor(shelter.capacity_persons * 4),
          daily_burn_rate: shelter.current_occupancy * 2.0,
          unit: "PACKETS",
          last_updated: Date.now(),
        },
        {
          id: `${shelter.id}_BABY_FORMULA`,
          shelter_id: shelter.id,
          item_type: "BABY_FORMULA",
          quantity_available: 40,
          daily_burn_rate: 6,
          unit: "TINS",
          last_updated: Date.now(),
        },
        {
          id: `${shelter.id}_ORS_SACHETS`,
          shelter_id: shelter.id,
          item_type: "ORS_SACHETS",
          quantity_available: 300,
          daily_burn_rate: 25,
          unit: "SACHETS",
          last_updated: Date.now(),
        }
      );
    }
  }

  if (newInventorySeed.length > 0) {
    await db.inventory.bulkAdd(newInventorySeed);
  }

  // Seed baseline households & clinical triage if empty
  const hCount = await db.households.count();
  if (hCount === 0) {
    const demoHouseholds: Household[] = [
      {
        id: "c4b1-demo-household-01",
        shelter_id: "OD-KEN-RAJ-001",
        head_name: "Pravat Kumar Nayak",
        hamlet_name: "Talachua",
        ward_number: 4,
        total_members: 5,
        male_count: 2,
        female_count: 2,
        child_under_five_count: 1,
        elderly_above_sixty_count: 0,
        livestock_count: 2,
        registered_at: Date.now() - 25 * 60 * 1000,
        sync_status: "SYNCED",
      },
      {
        id: "9e2a-demo-household-02",
        shelter_id: "OD-KEN-RAJ-001",
        head_name: "Bishnu Charan Das",
        hamlet_name: "Batighar Para",
        ward_number: 2,
        total_members: 6,
        male_count: 2,
        female_count: 3,
        child_under_five_count: 0,
        elderly_above_sixty_count: 1,
        livestock_count: 4,
        registered_at: Date.now() - 40 * 60 * 1000,
        sync_status: "SYNCED",
      },
      {
        id: "7f1c-demo-household-03",
        shelter_id: "AP-SHELTER-VSP-001",
        head_name: "K. Appala Naidu",
        hamlet_name: "Bheemili Fishermen Colony",
        ward_number: 3,
        total_members: 4,
        male_count: 1,
        female_count: 2,
        child_under_five_count: 1,
        elderly_above_sixty_count: 0,
        livestock_count: 1,
        registered_at: Date.now() - 15 * 60 * 1000,
        sync_status: "SYNCED",
      },
      {
        id: "3d4e-demo-household-04",
        shelter_id: "AP-SHELTER-WGD-010",
        head_name: "M. Subba Rao",
        hamlet_name: "Perupalem Beach",
        ward_number: 1,
        total_members: 3,
        male_count: 1,
        female_count: 1,
        child_under_five_count: 0,
        elderly_above_sixty_count: 1,
        livestock_count: 0,
        registered_at: Date.now() - 50 * 60 * 1000,
        sync_status: "SYNCED",
      },
    ];

    const demoTriage: EvacueeTriage[] = [
      {
        id: "triage-c4b1",
        household_id: "c4b1-demo-household-01",
        shelter_id: "OD-KEN-RAJ-001",
        person_name: "Sunita Nayak (Spouse)",
        vulnerability_category: "PREGNANT",
        triage_level: "P1_CRITICAL",
        notes: "Third trimester pregnancy (32 weeks), gestational hypertension history. Requires ground-floor maternity bay and ANM midwife regular checkup.",
        created_at: Date.now() - 3600000 * 3,
      },
      {
        id: "triage-9e2a",
        household_id: "9e2a-demo-household-02",
        shelter_id: "OD-KEN-RAJ-001",
        person_name: "Bishnu Charan Das (Head)",
        vulnerability_category: "ELDERLY_BEDRIDDEN",
        triage_level: "P1_CRITICAL",
        notes: "78-year-old bedridden stroke survivor, non-ambulatory. Stretcher access needed. Must assign quiet cot with continuous family attendant.",
        created_at: Date.now() - 3600000 * 2,
      },
      {
        id: "triage-7f1c",
        household_id: "7f1c-demo-household-03",
        shelter_id: "AP-SHELTER-VSP-001",
        person_name: "Baby Rupa Naidu",
        vulnerability_category: "INFANT",
        triage_level: "P2_URGENT",
        notes: "5-month infant requiring sterile boiled water, mother breastfeeding cubicle, and ORS replenishment kits.",
        created_at: Date.now() - 3600000 * 1,
      },
      {
        id: "triage-3d4e",
        household_id: "3d4e-demo-household-04",
        shelter_id: "AP-SHELTER-WGD-010",
        person_name: "M. Subba Rao",
        vulnerability_category: "CHRONIC_MED",
        triage_level: "P1_CRITICAL",
        notes: "Severe type-2 diabetes mellitus on daily insulin. Requires cold pack storage for insulin vials and daily blood sugar monitoring.",
        created_at: Date.now() - 3600000 * 4,
      },
    ];

    await db.households.bulkAdd(demoHouseholds);
    await db.triage.bulkAdd(demoTriage);
  }
}

