export interface DistrictDirectoryEntry {
  id: string;
  district_name: string;
  state: "ANDHRA_PRADESH" | "ODISHA";
  headquarters: string;
  coastal_length_km: number;
  vulnerability_tier: "VERY_HIGH" | "HIGH" | "MODERATE";
  key_coastal_mandals: string[];
  major_historical_cyclones: string[];
  deoc_helpline: string;
  designated_shelters: number;
  official_source: string;
}

export const COASTAL_DISTRICTS_DIRECTORY: DistrictDirectoryEntry[] = [
  // 12 Reorganized Coastal Districts of Andhra Pradesh (APSDMA / 2022 Gazette)
  {
    id: "AP-DIST-SRK",
    district_name: "Srikakulam",
    state: "ANDHRA_PRADESH",
    headquarters: "Srikakulam",
    coastal_length_km: 193,
    vulnerability_tier: "VERY_HIGH",
    key_coastal_mandals: ["Palasa", "Sompeta", "Kalingapatnam", "Gara", "Etcherla", "Ranastalam"],
    major_historical_cyclones: ["Titli (2018)", "Gulab (2021)", "1990 BOB 01"],
    deoc_helpline: "08942-240557 / 1077",
    designated_shelters: 48,
    official_source: "APSDMA / Official Gazette of Andhra Pradesh (2022 Reorganisation)",
  },
  {
    id: "AP-DIST-VZM",
    district_name: "Vizianagaram",
    state: "ANDHRA_PRADESH",
    headquarters: "Vizianagaram",
    coastal_length_km: 28,
    vulnerability_tier: "HIGH",
    key_coastal_mandals: ["Bhogapuram", "Pusapatirega"],
    major_historical_cyclones: ["Hudhud (2014)", "Titli (2018)"],
    deoc_helpline: "08922-236947 / 1077",
    designated_shelters: 14,
    official_source: "APSDMA / Official Gazette of Andhra Pradesh (2022 Reorganisation)",
  },
  {
    id: "AP-DIST-VSP",
    district_name: "Visakhapatnam",
    state: "ANDHRA_PRADESH",
    headquarters: "Visakhapatnam",
    coastal_length_km: 54,
    vulnerability_tier: "VERY_HIGH",
    key_coastal_mandals: ["Bheemunipatnam", "Visakhapatnam Urban", "Gajuwaka", "Pedagantyada"],
    major_historical_cyclones: ["Hudhud (2014)", "1990 Machilipatnam", "Gulab (2021)"],
    deoc_helpline: "0891-2560820 / 1077",
    designated_shelters: 36,
    official_source: "APSDMA / Official Gazette of Andhra Pradesh (2022 Reorganisation)",
  },
  {
    id: "AP-DIST-ANK",
    district_name: "Anakapalli",
    state: "ANDHRA_PRADESH",
    headquarters: "Anakapalli",
    coastal_length_km: 78,
    vulnerability_tier: "HIGH",
    key_coastal_mandals: ["Parawada", "Atchutapuram", "Rambilli", "S.Rayavaram", "Payakaraopeta"],
    major_historical_cyclones: ["Hudhud (2014)"],
    deoc_helpline: "08924-220033 / 1077",
    designated_shelters: 22,
    official_source: "APSDMA / Official Gazette of Andhra Pradesh (2022 Reorganisation)",
  },
  {
    id: "AP-DIST-KKD",
    district_name: "Kakinada",
    state: "ANDHRA_PRADESH",
    headquarters: "Kakinada",
    coastal_length_km: 115,
    vulnerability_tier: "VERY_HIGH",
    key_coastal_mandals: ["Thondangi", "U.Kothapalli", "Kakinada Rural", "Kakinada Urban", "Karapa", "Tallarevu"],
    major_historical_cyclones: ["Phethai (2018)", "1996 Kakinada Cyclone"],
    deoc_helpline: "0884-2365506 / 1077",
    designated_shelters: 52,
    official_source: "APSDMA / Official Gazette of Andhra Pradesh (2022 Reorganisation)",
  },
  {
    id: "AP-DIST-KNS",
    district_name: "Dr. B.R. Ambedkar Konaseema",
    state: "ANDHRA_PRADESH",
    headquarters: "Amalapuram",
    coastal_length_km: 92,
    vulnerability_tier: "VERY_HIGH",
    key_coastal_mandals: ["Katrenikona", "Uppalaguptam", "Allavaram", "Mamidikuduru", "Sakhinetipalli"],
    major_historical_cyclones: ["Phethai (2018)", "Michaung (2023)", "1996 Godavari Cyclone"],
    deoc_helpline: "08856-233208 / 1077",
    designated_shelters: 46,
    official_source: "APSDMA / Official Gazette of Andhra Pradesh (2022 Reorganisation)",
  },
  {
    id: "AP-DIST-WGD",
    district_name: "West Godavari",
    state: "ANDHRA_PRADESH",
    headquarters: "Bhimavaram",
    coastal_length_km: 42,
    vulnerability_tier: "HIGH",
    key_coastal_mandals: ["Narsapur", "Mogalthur"],
    major_historical_cyclones: ["1990 Machilipatnam", "Phethai (2018)"],
    deoc_helpline: "08816-224855 / 1077",
    designated_shelters: 24,
    official_source: "APSDMA / Official Gazette of Andhra Pradesh (2022 Reorganisation)",
  },
  {
    id: "AP-DIST-KRI",
    district_name: "Krishna",
    state: "ANDHRA_PRADESH",
    headquarters: "Machilipatnam",
    coastal_length_km: 111,
    vulnerability_tier: "VERY_HIGH",
    key_coastal_mandals: ["Machilipatnam", "Nagayalanka", "Koduru", "Kruthivennu", "Bantumilli"],
    major_historical_cyclones: ["Diviseema (1977)", "1990 Machilipatnam", "Michaung (2023)"],
    deoc_helpline: "08672-252572 / 1077",
    designated_shelters: 64,
    official_source: "APSDMA / Official Gazette of Andhra Pradesh (2022 Reorganisation)",
  },
  {
    id: "AP-DIST-BAP",
    district_name: "Bapatla",
    state: "ANDHRA_PRADESH",
    headquarters: "Bapatla",
    coastal_length_km: 88,
    vulnerability_tier: "VERY_HIGH",
    key_coastal_mandals: ["Nizampatnam", "Repalle", "Bapatla", "Karlapalem", "Vetapalem", "Chirala"],
    major_historical_cyclones: ["Diviseema (1977)", "Laila (2010)", "Michaung (2023)"],
    deoc_helpline: "08643-224445 / 1077",
    designated_shelters: 56,
    official_source: "APSDMA / Official Gazette of Andhra Pradesh (2022 Reorganisation)",
  },
  {
    id: "AP-DIST-PKM",
    district_name: "Prakasam",
    state: "ANDHRA_PRADESH",
    headquarters: "Ongole",
    coastal_length_km: 102,
    vulnerability_tier: "HIGH",
    key_coastal_mandals: ["Chinnaganjam", "Naguluppalapadu", "Kothapatnam", "Tangutur", "Singarayakonda"],
    major_historical_cyclones: ["Laila (2010)", "Michaung (2023)"],
    deoc_helpline: "08592-281400 / 1077",
    designated_shelters: 38,
    official_source: "APSDMA / Official Gazette of Andhra Pradesh (2022 Reorganisation)",
  },
  {
    id: "AP-DIST-NEL",
    district_name: "Sri Potti Sriramulu Nellore",
    state: "ANDHRA_PRADESH",
    headquarters: "Nellore",
    coastal_length_km: 169,
    vulnerability_tier: "VERY_HIGH",
    key_coastal_mandals: ["Kavali", "Allur", "Vidavalur", "Indukurpet", "Thotapalligudur", "Muthukur"],
    major_historical_cyclones: ["Nilam (2012)", "Michaung (2023)", "Mandaus (2022)"],
    deoc_helpline: "0861-2331477 / 1077",
    designated_shelters: 58,
    official_source: "APSDMA / Official Gazette of Andhra Pradesh (2022 Reorganisation)",
  },
  {
    id: "AP-DIST-TRP",
    district_name: "Tirupati",
    state: "ANDHRA_PRADESH",
    headquarters: "Tirupati",
    coastal_length_km: 72,
    vulnerability_tier: "HIGH",
    key_coastal_mandals: ["Vakadu", "Kota", "Chillakur", "Tada", "Sullurpeta", "Doravarisatram"],
    major_historical_cyclones: ["Michaung (2023)", "Nilam (2012)"],
    deoc_helpline: "0877-2236007 / 1077",
    designated_shelters: 32,
    official_source: "APSDMA / Official Gazette of Andhra Pradesh (2022 Reorganisation)",
  },

  // 6 Primary Coastal Districts of Odisha (OSDMA / Special Relief Commissioner, Odisha)
  {
    id: "OD-DIST-KEN",
    district_name: "Kendrapara",
    state: "ODISHA",
    headquarters: "Kendrapara",
    coastal_length_km: 68,
    vulnerability_tier: "VERY_HIGH",
    key_coastal_mandals: ["Rajnagar", "Mahakalapada", "Marshaghai", "Garadpur", "Pattamundai", "Aul"],
    major_historical_cyclones: ["1971 Odisha Cyclone (10k casualties)", "1999 Super Cyclone (260 km/h)", "Phailin (2013)", "Yaas (2021)"],
    deoc_helpline: "06727-232803 / 1077",
    designated_shelters: 122,
    official_source: "OSDMA / District Disaster Management Authority (DDMA) Kendrapara",
  },
  {
    id: "OD-DIST-JAG",
    district_name: "Jagatsinghpur",
    state: "ODISHA",
    headquarters: "Jagatsinghpur",
    coastal_length_km: 48,
    vulnerability_tier: "VERY_HIGH",
    key_coastal_mandals: ["Erasama", "Balikuda", "Kujang", "Paradip Port Area", "Naugaon"],
    major_historical_cyclones: ["1999 Super Cyclone (BOB 06 Landfall)", "Phailin (2013)", "Fani (2019)"],
    deoc_helpline: "06722-220368 / 1077",
    designated_shelters: 85,
    official_source: "OSDMA / District Disaster Management Authority (DDMA) Jagatsinghpur",
  },
  {
    id: "OD-DIST-PUR",
    district_name: "Puri",
    state: "ODISHA",
    headquarters: "Puri",
    coastal_length_km: 155,
    vulnerability_tier: "VERY_HIGH",
    key_coastal_mandals: ["Krushnaprasad", "Brahmagiri", "Puri Sadar", "Gop", "Kakatpur", "Astaranga"],
    major_historical_cyclones: ["Fani (2019 Landfall - 215 km/h)", "1999 Super Cyclone", "Hudhud (2014)"],
    deoc_helpline: "06752-223237 / 1077",
    designated_shelters: 148,
    official_source: "OSDMA / District Disaster Management Authority (DDMA) Puri",
  },
  {
    id: "OD-DIST-GNJ",
    district_name: "Ganjam",
    state: "ODISHA",
    headquarters: "Chatrapur",
    coastal_length_km: 68,
    vulnerability_tier: "VERY_HIGH",
    key_coastal_mandals: ["Gopalpur", "Chatrapur", "Rangeilunda", "Chikiti", "Ganjam Block"],
    major_historical_cyclones: ["Phailin (2013 Landfall - 220 km/h)", "Titli (2018)", "Hudhud (2014)"],
    deoc_helpline: "06811-263700 / 1077",
    designated_shelters: 134,
    official_source: "OSDMA / District Disaster Management Authority (DDMA) Ganjam",
  },
  {
    id: "OD-DIST-BLS",
    district_name: "Balasore",
    state: "ODISHA",
    headquarters: "Balasore",
    coastal_length_km: 80,
    vulnerability_tier: "VERY_HIGH",
    key_coastal_mandals: ["Bhograi", "Jaleswar", "Baliapal", "Basta", "Remuna", "Bahanaga"],
    major_historical_cyclones: ["Yaas (2021 Landfall)", "Amphan (2020)", "Bulbul (2019)"],
    deoc_helpline: "06782-262674 / 1077",
    designated_shelters: 98,
    official_source: "OSDMA / District Disaster Management Authority (DDMA) Balasore",
  },
  {
    id: "OD-DIST-BHD",
    district_name: "Bhadrak",
    state: "ODISHA",
    headquarters: "Bhadrak",
    coastal_length_km: 50,
    vulnerability_tier: "VERY_HIGH",
    key_coastal_mandals: ["Basudevpur", "Chandbali", "Dhamra Port Basin", "Tihidi"],
    major_historical_cyclones: ["Yaas (2021 Dhamra Landfall)", "Bulbul (2019)", "Amphan (2020)"],
    deoc_helpline: "06784-251881 / 1077",
    designated_shelters: 76,
    official_source: "OSDMA / District Disaster Management Authority (DDMA) Bhadrak",
  },
];

/**
 * Find official directory entry for a given district and optional state
 */
export function getDistrictDirectory(districtName?: string, state?: string): DistrictDirectoryEntry | undefined {
  if (!districtName) return undefined;
  const cleanName = districtName.toLowerCase().trim();

  return COASTAL_DISTRICTS_DIRECTORY.find((d) => {
    const matchName =
      d.district_name.toLowerCase() === cleanName ||
      d.district_name.toLowerCase().includes(cleanName) ||
      cleanName.includes(d.district_name.toLowerCase());

    if (state) {
      return matchName && d.state === state;
    }
    return matchName;
  });
}
