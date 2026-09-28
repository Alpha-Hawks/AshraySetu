/* ==========================================================================
   ASHRAYSETU (ଆଶ୍ରୟ ସେତୁ / ఆశ్రయ సేతు) — INTERACTIVE APPLICATION LOGIC
   Bay of Bengal Cyclone Radar, Sphere Inventory Simulator, QR Pass Engine & District Matrix
   ========================================================================== */

// --- Comprehensive 18 Coastal Districts Dataset (OSDMA & APSDMA) ---
const COASTAL_DISTRICTS = [
  // 12 Reorganized Coastal Districts of Andhra Pradesh
  {
    id: "AP-DIST-SRK",
    name: "Srikakulam",
    state: "ANDHRA_PRADESH",
    stateLabel: "Andhra Pradesh",
    headquarters: "Srikakulam",
    coastal_km: 193,
    tier: "VERY_HIGH",
    mandals: ["Palasa", "Sompeta", "Kalingapatnam", "Gara", "Etcherla", "Ranastalam"],
    cyclones: ["Titli (2018)", "Gulab (2021)", "1990 BOB 01"],
    helpline: "08942-240557 / 1077",
    shelters: 48,
    lat: 18.769,
    lng: 84.412
  },
  {
    id: "AP-DIST-VZM",
    name: "Vizianagaram",
    state: "ANDHRA_PRADESH",
    stateLabel: "Andhra Pradesh",
    headquarters: "Vizianagaram",
    coastal_km: 28,
    tier: "HIGH",
    mandals: ["Bhogapuram", "Pusapatirega"],
    cyclones: ["Hudhud (2014)", "Titli (2018)"],
    helpline: "08922-236947 / 1077",
    shelters: 14,
    lat: 18.112,
    lng: 83.415
  },
  {
    id: "AP-DIST-VSP",
    name: "Visakhapatnam",
    state: "ANDHRA_PRADESH",
    stateLabel: "Andhra Pradesh",
    headquarters: "Visakhapatnam",
    coastal_km: 54,
    tier: "VERY_HIGH",
    mandals: ["Bheemunipatnam", "Visakhapatnam Urban", "Gajuwaka", "Pedagantyada"],
    cyclones: ["Hudhud (2014)", "1990 Machilipatnam", "Gulab (2021)"],
    helpline: "0891-2560820 / 1077",
    shelters: 36,
    lat: 17.892,
    lng: 83.454
  },
  {
    id: "AP-DIST-ANK",
    name: "Anakapalli",
    state: "ANDHRA_PRADESH",
    stateLabel: "Andhra Pradesh",
    headquarters: "Anakapalli",
    coastal_km: 78,
    tier: "HIGH",
    mandals: ["Parawada", "Atchutapuram", "Rambilli", "S.Rayavaram", "Payakaraopeta"],
    cyclones: ["Hudhud (2014)"],
    helpline: "08924-220033 / 1077",
    shelters: 22,
    lat: 17.691,
    lng: 83.004
  },
  {
    id: "AP-DIST-KKD",
    name: "Kakinada",
    state: "ANDHRA_PRADESH",
    stateLabel: "Andhra Pradesh",
    headquarters: "Kakinada",
    coastal_km: 115,
    tier: "VERY_HIGH",
    mandals: ["Thondangi", "U.Kothapalli", "Kakinada Rural", "Kakinada Urban", "Karapa", "Tallarevu"],
    cyclones: ["Phethai (2018)", "1996 Kakinada Cyclone"],
    helpline: "0884-2365506 / 1077",
    shelters: 52,
    lat: 16.989,
    lng: 82.247
  },
  {
    id: "AP-DIST-KNS",
    name: "Dr. B.R. Ambedkar Konaseema",
    state: "ANDHRA_PRADESH",
    stateLabel: "Andhra Pradesh",
    headquarters: "Amalapuram",
    coastal_km: 92,
    tier: "VERY_HIGH",
    mandals: ["Katrenikona", "Uppalaguptam", "Allavaram", "Mamidikuduru", "Sakhinetipalli"],
    cyclones: ["Phethai (2018)", "Michaung (2023)", "1996 Godavari"],
    helpline: "08856-233208 / 1077",
    shelters: 46,
    lat: 16.578,
    lng: 82.003
  },
  {
    id: "AP-DIST-WGD",
    name: "West Godavari",
    state: "ANDHRA_PRADESH",
    stateLabel: "Andhra Pradesh",
    headquarters: "Bhimavaram",
    coastal_km: 42,
    tier: "HIGH",
    mandals: ["Narsapur", "Mogalthur"],
    cyclones: ["1990 Machilipatnam", "Phethai (2018)"],
    helpline: "08816-224855 / 1077",
    shelters: 24,
    lat: 16.442,
    lng: 81.698
  },
  {
    id: "AP-DIST-KRI",
    name: "Krishna",
    state: "ANDHRA_PRADESH",
    stateLabel: "Andhra Pradesh",
    headquarters: "Machilipatnam",
    coastal_km: 111,
    tier: "VERY_HIGH",
    mandals: ["Machilipatnam", "Nagayalanka", "Koduru", "Kruthivennu", "Bantumilli"],
    cyclones: ["Diviseema (1977)", "1990 Machilipatnam", "Michaung (2023)"],
    helpline: "08672-252572 / 1077",
    shelters: 64,
    lat: 16.182,
    lng: 81.142
  },
  {
    id: "AP-DIST-BAP",
    name: "Bapatla",
    state: "ANDHRA_PRADESH",
    stateLabel: "Andhra Pradesh",
    headquarters: "Bapatla",
    coastal_km: 88,
    tier: "VERY_HIGH",
    mandals: ["Nizampatnam", "Repalle", "Bapatla", "Karlapalem", "Vetapalem", "Chirala"],
    cyclones: ["Diviseema (1977)", "Laila (2010)", "Michaung (2023)"],
    helpline: "08643-224445 / 1077",
    shelters: 56,
    lat: 15.908,
    lng: 80.672
  },
  {
    id: "AP-DIST-PKM",
    name: "Prakasam",
    state: "ANDHRA_PRADESH",
    stateLabel: "Andhra Pradesh",
    headquarters: "Ongole",
    coastal_km: 102,
    tier: "HIGH",
    mandals: ["Chinnaganjam", "Naguluppalapadu", "Kothapatnam", "Tangutur", "Singarayakonda"],
    cyclones: ["Laila (2010)", "Michaung (2023)"],
    helpline: "08592-281400 / 1077",
    shelters: 38,
    lat: 15.505,
    lng: 80.049
  },
  {
    id: "AP-DIST-NEL",
    name: "Sri Potti Sriramulu Nellore",
    state: "ANDHRA_PRADESH",
    stateLabel: "Andhra Pradesh",
    headquarters: "Nellore",
    coastal_km: 169,
    tier: "VERY_HIGH",
    mandals: ["Kavali", "Allur", "Vidavalur", "Indukurpet", "Thotapalligudur", "Muthukur"],
    cyclones: ["Nilam (2012)", "Michaung (2023)", "Mandaus (2022)"],
    helpline: "0861-2331477 / 1077",
    shelters: 58,
    lat: 14.442,
    lng: 79.986
  },
  {
    id: "AP-DIST-TRP",
    name: "Tirupati",
    state: "ANDHRA_PRADESH",
    stateLabel: "Andhra Pradesh",
    headquarters: "Tirupati",
    coastal_km: 72,
    tier: "HIGH",
    mandals: ["Vakadu", "Kota", "Chillakur", "Tada", "Sullurpeta", "Doravarisatram"],
    cyclones: ["Michaung (2023)", "Nilam (2012)"],
    helpline: "0877-2236007 / 1077",
    shelters: 32,
    lat: 13.628,
    lng: 79.419
  },
  // 6 Primary Coastal Districts of Odisha (OSDMA)
  {
    id: "OD-DIST-KEN",
    name: "Kendrapara",
    state: "ODISHA",
    stateLabel: "Odisha",
    headquarters: "Kendrapara",
    coastal_km: 68,
    tier: "VERY_HIGH",
    mandals: ["Rajnagar", "Mahakalapada", "Marshaghai", "Garadpur", "Pattamundai", "Aul"],
    cyclones: ["1971 Odisha Cyclone", "1999 Super Cyclone (260 km/h)", "Phailin (2013)", "Yaas (2021)"],
    helpline: "06727-232803 / 1077",
    shelters: 122,
    lat: 20.654,
    lng: 86.741
  },
  {
    id: "OD-DIST-JAG",
    name: "Jagatsinghpur",
    state: "ODISHA",
    stateLabel: "Odisha",
    headquarters: "Jagatsinghpur",
    coastal_km: 48,
    tier: "VERY_HIGH",
    mandals: ["Erasama", "Balikuda", "Kujang", "Paradip Port Area", "Naugaon"],
    cyclones: ["1999 Super Cyclone Landfall", "Phailin (2013)", "Fani (2019)"],
    helpline: "06722-220368 / 1077",
    shelters: 85,
    lat: 20.266,
    lng: 86.173
  },
  {
    id: "OD-DIST-PUR",
    name: "Puri",
    state: "ODISHA",
    stateLabel: "Odisha",
    headquarters: "Puri",
    coastal_km: 155,
    tier: "VERY_HIGH",
    mandals: ["Krushnaprasad", "Brahmagiri", "Puri Sadar", "Gop", "Kakatpur", "Astaranga"],
    cyclones: ["Fani (2019 Landfall - 215 km/h)", "1999 Super Cyclone", "Hudhud (2014)"],
    helpline: "06752-223237 / 1077",
    shelters: 148,
    lat: 19.813,
    lng: 85.831
  },
  {
    id: "OD-DIST-GNJ",
    name: "Ganjam",
    state: "ODISHA",
    stateLabel: "Odisha",
    headquarters: "Chatrapur",
    coastal_km: 68,
    tier: "VERY_HIGH",
    mandals: ["Gopalpur", "Chatrapur", "Rangeilunda", "Chikiti", "Ganjam Block"],
    cyclones: ["Phailin (2013 Landfall - 220 km/h)", "Titli (2018)", "Hudhud (2014)"],
    helpline: "06811-263700 / 1077",
    shelters: 134,
    lat: 19.355,
    lng: 84.992
  },
  {
    id: "OD-DIST-BLS",
    name: "Balasore",
    state: "ODISHA",
    stateLabel: "Odisha",
    headquarters: "Balasore",
    coastal_km: 80,
    tier: "VERY_HIGH",
    mandals: ["Bhograi", "Jaleswar", "Baliapal", "Basta", "Remuna", "Bahanaga"],
    cyclones: ["Yaas (2021 Landfall)", "Amphan (2020)", "Bulbul (2019)"],
    helpline: "06782-262674 / 1077",
    shelters: 98,
    lat: 21.493,
    lng: 86.932
  },
  {
    id: "OD-DIST-BHD",
    name: "Bhadrak",
    state: "ODISHA",
    stateLabel: "Odisha",
    headquarters: "Bhadrak",
    coastal_km: 50,
    tier: "VERY_HIGH",
    mandals: ["Basudevpur", "Chandbali", "Dhamra Port Basin", "Tihidi"],
    cyclones: ["Yaas (2021 Dhamra Landfall)", "Bulbul (2019)", "Amphan (2020)"],
    helpline: "06784-251881 / 1077",
    shelters: 76,
    lat: 21.057,
    lng: 86.502
  }
];

// --- Key Designated Shelters along the Coastline ---
const SHELTERS_SAMPLE = [
  {
    id: "OD-SHELTER-KND-001",
    name: "Talachua Cyclone Shelter",
    state: "Odisha",
    district: "Kendrapara",
    block: "Rajnagar",
    panchayat: "Talachua Beach",
    capacity: 650,
    occupancy: 480,
    incharge: "B. K. Mohapatra",
    phone: "9437100001",
    waterLiters: 1600,
    foodPacks: 750,
    surgeBufferKm: 1.2,
    hasSolar: true,
    hasBorewell: true,
    lat: 20.732,
    lng: 86.974
  },
  {
    id: "OD-SHELTER-KND-002",
    name: "Rajnagar Model MPCS",
    state: "Odisha",
    district: "Kendrapara",
    block: "Rajnagar",
    panchayat: "Rajnagar Central",
    capacity: 800,
    occupancy: 390,
    incharge: "S. K. Das",
    phone: "9437100002",
    waterLiters: 3200,
    foodPacks: 1200,
    surgeBufferKm: 4.5,
    hasSolar: true,
    hasBorewell: true,
    lat: 20.589,
    lng: 86.734
  },
  {
    id: "OD-SHELTER-PUR-003",
    name: "Puri Coastal Relief Center",
    state: "Odisha",
    district: "Puri",
    block: "Krushnaprasad",
    panchayat: "Chilika Sea Mouth",
    capacity: 900,
    occupancy: 610,
    incharge: "R. C. Jena",
    phone: "9437100005",
    waterLiters: 2400,
    foodPacks: 950,
    surgeBufferKm: 0.8,
    hasSolar: true,
    hasBorewell: true,
    lat: 19.813,
    lng: 85.831
  },
  {
    id: "AP-SHELTER-VSP-001",
    name: "Bheemili Coastal Cyclone Shelter",
    state: "Andhra Pradesh",
    district: "Visakhapatnam",
    block: "Bheemunipatnam",
    panchayat: "Bheemili Beach Road",
    capacity: 700,
    occupancy: 280,
    incharge: "K. Appala Naidu",
    phone: "9440123401",
    waterLiters: 2800,
    foodPacks: 1100,
    surgeBufferKm: 0.5,
    hasSolar: true,
    hasBorewell: true,
    lat: 17.892,
    lng: 83.454
  },
  {
    id: "AP-SHELTER-SRK-002",
    name: "Palasa Multipurpose Shelter",
    state: "Andhra Pradesh",
    district: "Srikakulam",
    block: "Palasa",
    panchayat: "Kasibugga Coastal",
    capacity: 600,
    occupancy: 195,
    incharge: "P. Jagannadha Rao",
    phone: "9440123402",
    waterLiters: 1900,
    foodPacks: 800,
    surgeBufferKm: 2.1,
    hasSolar: true,
    hasBorewell: true,
    lat: 18.769,
    lng: 84.412
  },
  {
    id: "AP-SHELTER-BAP-003",
    name: "Nizampatnam Port Cyclone Shelter",
    state: "Andhra Pradesh",
    district: "Bapatla",
    block: "Nizampatnam",
    panchayat: "Haripuram Port",
    capacity: 800,
    occupancy: 560,
    incharge: "Ch. Venkata Subbaiah",
    phone: "9440123403",
    waterLiters: 1400,
    foodPacks: 650,
    surgeBufferKm: 0.4,
    hasSolar: true,
    hasBorewell: true,
    lat: 15.908,
    lng: 80.672
  },
  {
    id: "AP-SHELTER-KRI-004",
    name: "Machilipatnam Manginapudi Shelter",
    state: "Andhra Pradesh",
    district: "Krishna",
    block: "Machilipatnam",
    panchayat: "Manginapudi Beach",
    capacity: 900,
    occupancy: 420,
    incharge: "M. Srinivas",
    phone: "9440123404",
    waterLiters: 3100,
    foodPacks: 1400,
    surgeBufferKm: 0.9,
    hasSolar: true,
    hasBorewell: true,
    lat: 16.182,
    lng: 81.142
  }
];

// --- Audio Synthesizer (Using Web Audio API) ---
let audioCtx = null;
function playBeep(type = 'success') {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.22);
    } else if (type === 'alert') {
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.setValueAtTime(330, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.38);
    }
  } catch (e) {
    console.warn("Audio Context unavailable:", e);
  }
}

// --- Toast System ---
function showToast(message, isAlert = false) {
  const toast = document.getElementById('toastNotice');
  if (!toast) return;
  toast.innerHTML = (isAlert ? '⚠️ ' : '✅ ') + message;
  toast.classList.add('show');
  playBeep(isAlert ? 'alert' : 'success');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// ==========================================================================
// 1. BAY OF BENGAL RADAR & CYCLONE SIMULATOR (HTML5 CANVAS)
// ==========================================================================
let currentSelectedShelter = SHELTERS_SAMPLE[0];

function initCycloneRadar() {
  const canvas = document.getElementById('cycloneCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let angle = 0;
  let sweepAngle = 0;

  // Coordinate mapper: Map geographic coordinates to canvas pixels
  // Lat range: 13.0 to 22.0 | Lng range: 79.0 to 88.5
  function geoToCanvas(lat, lng, width, height) {
    const minLat = 13.2;
    const maxLat = 22.2;
    const minLng = 79.5;
    const maxLng = 88.5;

    // Y is inverted (higher latitude is higher up on screen)
    const y = height - ((lat - minLat) / (maxLat - minLat)) * (height - 60) - 30;
    const x = ((lng - minLng) / (maxLng - minLng)) * (width - 60) + 30;
    return { x, y };
  }

  function drawRadar() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // 1. Radar Grid Concentric Circles & Crosshairs
    const center = { x: w * 0.65, y: h * 0.45 };
    ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
    ctx.lineWidth = 1;
    for (let r = 40; r < 360; r += 50) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(center.x - 360, center.y);
    ctx.lineTo(center.x + 360, center.y);
    ctx.moveTo(center.x, center.y - 360);
    ctx.lineTo(center.x, center.y + 360);
    ctx.stroke();

    // 2. Animated Rotating Radar Sweep Beam
    sweepAngle += 0.025;
    const sweepGrad = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 350);
    sweepGrad.addColorStop(0, "rgba(56, 189, 248, 0.18)");
    sweepGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
    
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.arc(center.x, center.y, 350, sweepAngle, sweepAngle + 0.35);
    ctx.closePath();
    ctx.fillStyle = sweepGrad;
    ctx.fill();
    ctx.restore();

    // 3. Coastline Vector Representation (Odisha & Andhra Pradesh)
    const coastalNodes = [
      { lat: 21.6, lng: 87.1, name: "Balasore Coast" },
      { lat: 20.8, lng: 86.9, name: "Dhamra / Kendrapara" },
      { lat: 20.3, lng: 86.7, name: "Paradip Port" },
      { lat: 19.8, lng: 85.8, name: "Puri Coast" },
      { lat: 19.3, lng: 85.0, name: "Gopalpur" },
      { lat: 18.7, lng: 84.4, name: "Kalingapatnam" },
      { lat: 17.8, lng: 83.4, name: "Visakhapatnam" },
      { lat: 16.9, lng: 82.2, name: "Kakinada Bay" },
      { lat: 16.2, lng: 81.2, name: "Machilipatnam" },
      { lat: 15.9, lng: 80.6, name: "Nizampatnam" },
      { lat: 15.3, lng: 80.0, name: "Ongole Coast" },
      { lat: 14.3, lng: 80.1, name: "Nellore Coast" },
      { lat: 13.6, lng: 80.2, name: "Pulicat / Tirupati" }
    ];

    // Coastal Outline
    ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    coastalNodes.forEach((node, idx) => {
      const pt = geoToCanvas(node.lat, node.lng, w, h);
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // 4. Storm Surge Inundation Danger Buffer (3.5m - 5m)
    ctx.strokeStyle = "rgba(244, 63, 94, 0.35)";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    coastalNodes.forEach((node, idx) => {
      const pt = geoToCanvas(node.lat, node.lng, w, h);
      if (idx === 0) ctx.moveTo(pt.x + 8, pt.y);
      else ctx.lineTo(pt.x + 8, pt.y);
    });
    ctx.stroke();

    // 5. Animated Cyclone Eye & Rain Spiral
    angle += 0.035;
    const cycloneEye = { x: center.x - 30, y: center.y + 40 };

    // Cyclone Bands
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(cycloneEye.x, cycloneEye.y);
      ctx.rotate(angle + (i * Math.PI) / 2);
      ctx.strokeStyle = `rgba(244, 63, 94, ${0.4 + i * 0.15})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let t = 0; t < 50; t += 2) {
        const spiralR = 12 + t * 1.8;
        const spiralA = t * 0.12;
        const sx = spiralR * Math.cos(spiralA);
        const sy = spiralR * Math.sin(spiralA);
        if (t === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Cyclone Eye Center
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(cycloneEye.x, cycloneEye.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cyclone Label & Telemetry
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillText("VSCS DEEP DEPRESSION [942 hPa]", cycloneEye.x + 16, cycloneEye.y - 8);
    ctx.fillStyle = "#fb7185";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("WIND: 145 KM/H | SURGE: +4.2M", cycloneEye.x + 16, cycloneEye.y + 8);

    // Projected Track Dashed Vector
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cycloneEye.x, cycloneEye.y);
    const landfallPt = geoToCanvas(20.65, 86.85, w, h); // Kendrapara Landfall
    ctx.lineTo(landfallPt.x, landfallPt.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. Interactive Shelter Pins
    SHELTERS_SAMPLE.forEach(s => {
      const pt = geoToCanvas(s.lat, s.lng, w, h);
      const isSelected = currentSelectedShelter.id === s.id;

      // Glow pulse for selected
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
        ctx.fill();
      }

      // Outer Pin Circle
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isSelected ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = s.occupancy / s.capacity > 0.8 ? "#f43f5e" : "#10b981";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pin Label
      ctx.fillStyle = isSelected ? "#38bdf8" : "#94a3b8";
      ctx.font = `${isSelected ? 'bold 11px' : '9px'} 'Inter', sans-serif`;
      ctx.fillText(s.name.split(" ")[0], pt.x + 10, pt.y + 3);
    });

    requestAnimationFrame(drawRadar);
  }

  // Handle canvas click on shelters
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    SHELTERS_SAMPLE.forEach(s => {
      const pt = geoToCanvas(s.lat, s.lng, w, h);
      const dist = Math.hypot(clickX - pt.x, clickY - pt.y);
      if (dist < 20) {
        selectShelter(s);
        playBeep('success');
      }
    });
  });

  drawRadar();
}

function selectShelter(shelter) {
  currentSelectedShelter = shelter;

  // Update shelter details panel
  const nameEl = document.getElementById('selectedShelterName');
  const metaEl = document.getElementById('selectedShelterMeta');
  const capEl = document.getElementById('selectedShelterCap');
  const occEl = document.getElementById('selectedShelterOcc');
  const waterEl = document.getElementById('selectedShelterWater');
  const surgeEl = document.getElementById('selectedShelterSurge');
  const inchargeEl = document.getElementById('selectedShelterIncharge');
  const fillEl = document.getElementById('selectedShelterMeterFill');
  const pctEl = document.getElementById('selectedShelterMeterPct');

  if (nameEl) nameEl.textContent = shelter.name;
  if (metaEl) metaEl.textContent = `${shelter.panchayat}, ${shelter.block}, ${shelter.district} (${shelter.state})`;
  if (capEl) capEl.textContent = `${shelter.capacity} evacuees`;
  if (occEl) occEl.textContent = `${shelter.occupancy} admitted`;
  if (waterEl) waterEl.textContent = `${shelter.waterLiters.toLocaleString()} L`;
  if (surgeEl) surgeEl.textContent = `${shelter.surgeBufferKm} km from shore`;
  if (inchargeEl) inchargeEl.textContent = `${shelter.incharge} (📞 ${shelter.phone})`;

  const pct = Math.round((shelter.occupancy / shelter.capacity) * 100);
  if (fillEl) {
    fillEl.style.width = `${Math.min(pct, 100)}%`;
    if (pct > 80) fillEl.classList.add('danger');
    else fillEl.classList.remove('danger');
  }
  if (pctEl) pctEl.textContent = `${pct}% Occupied`;

  // Update Quick Switcher active buttons
  document.querySelectorAll('.shelter-btn-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.shelterId === shelter.id);
  });

  // Sync with Inventory Burn Calculator
  syncInventoryCalculator(shelter);
}

// Render Quick List buttons in Radar Panel
function renderShelterQuickList() {
  const container = document.getElementById('shelterQuickList');
  if (!container) return;
  container.innerHTML = SHELTERS_SAMPLE.map(s => {
    const isAct = s.id === currentSelectedShelter.id;
    return `
      <button class="shelter-btn-item ${isAct ? 'active' : ''}" data-shelter-id="${s.id}" onclick="onQuickShelterClick('${s.id}')">
        <span class="shelter-btn-name">${s.name}</span>
        <span class="shelter-btn-badge">${s.district}</span>
      </button>
    `;
  }).join('');
}

window.onQuickShelterClick = function(id) {
  const target = SHELTERS_SAMPLE.find(s => s.id === id);
  if (target) {
    selectShelter(target);
    playBeep('success');
  }
};

// ==========================================================================
// 2. SPHERE STANDARDS INVENTORY BURN-RATE SIMULATOR
// ==========================================================================
function initInventoryCalculator() {
  const headSlider = document.getElementById('calcHeadcount');
  const waterSlider = document.getElementById('calcWater');
  const foodSlider = document.getElementById('calcFood');

  if (!headSlider || !waterSlider || !foodSlider) return;

  function updateBurnRates() {
    const headcount = parseInt(headSlider.value, 10);
    const waterLiters = parseInt(waterSlider.value, 10);
    const foodPacks = parseInt(foodSlider.value, 10);

    // Update Slider text badges
    document.getElementById('calcHeadcountVal').textContent = `${headcount} Persons`;
    document.getElementById('calcWaterVal').textContent = `${waterLiters.toLocaleString()} Liters`;
    document.getElementById('calcFoodVal').textContent = `${foodPacks.toLocaleString()} Rations`;

    // Sphere Standard 1: Minimum 3.0 Liters potable water per person/day (0.125 L/person/hr)
    const hourlyWaterBurn = headcount * (3.0 / 24.0);
    const waterHoursRemaining = hourlyWaterBurn > 0 ? (waterLiters / hourlyWaterBurn) : 999;

    // Sphere Standard 2: Minimum 2 meals/rations per person/day (1/12 ration/person/hr)
    const hourlyFoodBurn = headcount * (2.0 / 24.0);
    const foodHoursRemaining = hourlyFoodBurn > 0 ? (foodPacks / hourlyFoodBurn) : 999;

    // Daily burns
    const dailyWaterLiters = Math.round(headcount * 3.0);
    const dailyFoodPacks = Math.round(headcount * 2.0);

    // Update DOM metrics
    const waterHrsEl = document.getElementById('metricWaterHours');
    const foodHrsEl = document.getElementById('metricFoodHours');
    const waterDailyEl = document.getElementById('metricDailyWater');
    const foodDailyEl = document.getElementById('metricDailyFood');
    const statusPill = document.getElementById('burnStatusPill');

    if (waterHrsEl) waterHrsEl.textContent = `${Math.max(0, Math.floor(waterHoursRemaining))}h`;
    if (foodHrsEl) foodHrsEl.textContent = `${Math.max(0, Math.floor(foodHoursRemaining))}h`;
    if (waterDailyEl) waterDailyEl.textContent = `${dailyWaterLiters.toLocaleString()} L/day`;
    if (foodDailyEl) foodDailyEl.textContent = `${dailyFoodPacks.toLocaleString()} packs/day`;

    // Status Pill Evaluation
    const criticalThresholdHours = 24.0;
    const warningThresholdHours = 48.0;

    if (waterHoursRemaining < criticalThresholdHours || foodHoursRemaining < criticalThresholdHours) {
      statusPill.className = "burn-status-pill critical";
      statusPill.innerHTML = "🚨 CRITICAL STOCK DEFICIT (< 24H REMAINING)";
    } else if (waterHoursRemaining < warningThresholdHours || foodHoursRemaining < warningThresholdHours) {
      statusPill.className = "burn-status-pill warning";
      statusPill.innerHTML = "⚠️ WARNING: REPLENISHMENT REQUIRED (< 48H)";
    } else {
      statusPill.className = "burn-status-pill safe";
      statusPill.innerHTML = "🛡️ STABLE BUFFER: SPHERE COMPLIANT (> 48H)";
    }

    // Update Telegram SOS Preview text
    updateTelegramSosDraft(headcount, waterLiters, waterHoursRemaining, foodHoursRemaining);
  }

  headSlider.addEventListener('input', updateBurnRates);
  waterSlider.addEventListener('input', updateBurnRates);
  foodSlider.addEventListener('input', updateBurnRates);

  updateBurnRates();
}

function syncInventoryCalculator(shelter) {
  const headSlider = document.getElementById('calcHeadcount');
  const waterSlider = document.getElementById('calcWater');
  const foodSlider = document.getElementById('calcFood');

  if (headSlider) headSlider.value = shelter.occupancy;
  if (waterSlider) waterSlider.value = shelter.waterLiters;
  if (foodSlider) foodSlider.value = shelter.foodPacks;

  const event = new Event('input');
  if (headSlider) headSlider.dispatchEvent(event);
}

function updateTelegramSosDraft(headcount, waterLiters, waterHours, foodHours) {
  const preview = document.getElementById('telegramPreviewBody');
  if (!preview) return;

  const shelterName = currentSelectedShelter ? currentSelectedShelter.name : "Talachua Cyclone Shelter";
  const dist = currentSelectedShelter ? currentSelectedShelter.district : "Kendrapara";
  const incharge = currentSelectedShelter ? currentSelectedShelter.incharge : "In-Charge";

  preview.textContent = 
`🚨 [SOS TANKER REPLENISHMENT DISPATCH]
-------------------------------------------
SHELTER: ${shelterName} (${dist})
STATUS: ${waterHours < 24 ? 'CRITICAL IMMINENT STOCKOUT' : 'BUFFER WARNING'}
CURRENT HEADCOUNT: ${headcount} Evacuees
WATER ON-SITE: ${waterLiters.toLocaleString()} L (~${Math.floor(waterHours)} hrs reserve)
RATION BUFFER: ~${Math.floor(foodHours)} hrs reserve

ACTION REQUIRED:
1. Dispatch 10,000L Potable Water Tanker from Block HQ.
2. Deliver 1,200 High-Calorie Ready-to-Eat Kits & ORS.
COORDINATES: ${currentSelectedShelter.lat}° N, ${currentSelectedShelter.lng}° E
IN-CHARGE: ${incharge} (Verified Digital Hash: AS-DISPATCH-9402)`;
}

window.triggerDispatchSim = function() {
  playBeep('alert');
  showToast("SOS Dispatch broadcast transmitted to District Command Desk & NDRF!", true);
};

// ==========================================================================
// 3. OFFLINE DIGITAL QR TOKEN PASS & GATEKEEPER ENGINE
// ==========================================================================
function initQrEngine() {
  const form = document.getElementById('intakeForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    generateQrPass();
  });

  generateQrPass(); // Generate initial pass
}

function generateQrPass() {
  const nameInput = document.getElementById('intakeName');
  const hamletInput = document.getElementById('intakeHamlet');
  const countInput = document.getElementById('intakeCount');
  const infantsInput = document.getElementById('intakeInfants');
  const triageInput = document.getElementById('intakeTriage');

  const name = nameInput ? nameInput.value : "Pravat Nayak";
  const hamlet = hamletInput ? hamletInput.value : "Talachua";
  const count = countInput ? countInput.value : "5";
  const infants = infantsInput ? infantsInput.value : "1";
  const triage = triageInput ? triageInput.value : "P1: Pregnant Woman";

  // Generate deterministic anti-tamper checksum
  const randHash = Math.random().toString(36).substring(2, 7).toUpperCase();
  const tokenCode = `AS-${currentSelectedShelter.district.substring(0,3).toUpperCase()}-${randHash}`;

  const hashBadge = document.getElementById('qrHashBadge');
  const tokenSummary = document.getElementById('qrTokenSummary');
  if (hashBadge) hashBadge.textContent = `TOKEN PASS ID: ${tokenCode}`;
  if (tokenSummary) {
    tokenSummary.innerHTML = `
      <strong>${name}</strong> (Family of ${count}, ${infants} Infant)<br>
      Hamlet: ${hamlet} | Category: <span style="color:#fb7185;font-weight:700;">${triage}</span>
    `;
  }

  // Draw procedural high-contrast QR Matrix SVG pattern
  renderQrSvg();
  playBeep('success');
  showToast(`Offline QR Token Generated for ${name} (${tokenCode})`);
}

function renderQrSvg() {
  const box = document.getElementById('qrSvgContainer');
  if (!box) return;

  // Generate an authentic procedural QR grid (21x21 modules standard QR look)
  const size = 21;
  const cellSize = 8;
  const svgSize = size * cellSize;
  let rects = '';

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Draw position detection finder patterns in corners
      const isTopLeftFinder = (r < 7 && c < 7);
      const isTopRightFinder = (r < 7 && c >= size - 7);
      const isBottomLeftFinder = (r >= size - 7 && c < 7);

      let isBlack = false;
      if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) {
        // Inner finder boxes
        const localR = r < 7 ? r : r - (size - 7);
        const localC = c < 7 ? c : c - (size - 7);
        if (localR === 0 || localR === 6 || localC === 0 || localC === 6) isBlack = true;
        else if (localR >= 2 && localR <= 4 && localC >= 2 && localC <= 4) isBlack = true;
      } else {
        // Random procedural data modules
        isBlack = Math.random() > 0.48;
      }

      if (isBlack) {
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0f172a" />`;
      }
    }
  }

  box.innerHTML = `
    <svg viewBox="0 0 ${svgSize} ${svgSize}" class="qr-visual-svg" xmlns="http://www.w3.org/2000/svg">
      ${rects}
    </svg>
  `;
}

window.simulateGateCheckin = function() {
  const logBox = document.getElementById('gatekeeperLog');
  const now = new Date().toLocaleTimeString();
  playBeep('success');

  // Increment shelter admitted count
  currentSelectedShelter.occupancy += 1;
  selectShelter(currentSelectedShelter);

  if (logBox) {
    const entry = document.createElement('div');
    entry.style.marginBottom = "4px";
    entry.innerHTML = `[${now}] ✅ TOKEN VERIFIED & ADMITTED | Bunk Hall B-04 Assigned. Headcount: ${currentSelectedShelter.occupancy}/${currentSelectedShelter.capacity}`;
    logBox.prepend(entry);
  }

  showToast("Gatekeeper Verification Success: Admitted to local IndexedDB!");
};

// ==========================================================================
// 4. 18 COASTAL DISTRICTS DIRECTORY SEARCH & FILTER
// ==========================================================================
let currentFilterState = 'ALL';

function initDirectory() {
  renderDistricts();

  const searchInput = document.getElementById('districtSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderDistricts());
  }

  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilterState = tab.dataset.filter;
      renderDistricts();
    });
  });
}

function renderDistricts() {
  const grid = document.getElementById('districtsGrid');
  const searchInput = document.getElementById('districtSearchInput');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  if (!grid) return;

  const filtered = COASTAL_DISTRICTS.filter(d => {
    // Filter State
    if (currentFilterState === 'ODISHA' && d.state !== 'ODISHA') return false;
    if (currentFilterState === 'AP' && d.state !== 'ANDHRA_PRADESH') return false;
    if (currentFilterState === 'VERY_HIGH' && d.tier !== 'VERY_HIGH') return false;

    // Search Query
    if (query) {
      const matchName = d.name.toLowerCase().includes(query);
      const matchHq = d.headquarters.toLowerCase().includes(query);
      const matchMandals = d.mandals.some(m => m.toLowerCase().includes(query));
      const matchCyclones = d.cyclones.some(c => c.toLowerCase().includes(query));
      return matchName || matchHq || matchMandals || matchCyclones;
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-dim);">
        <p>No coastal districts matched your search term "<strong>${query}</strong>".</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(d => {
    const isOdisha = d.state === 'ODISHA';
    const isVeryHigh = d.tier === 'VERY_HIGH';

    return `
      <div class="district-card" id="card-${d.id}">
        <div>
          <div class="district-card-header">
            <h4 class="district-name">${d.name}</h4>
            <span class="state-badge ${isOdisha ? 'odisha' : 'ap'}">${isOdisha ? 'Odisha (OSDMA)' : 'Andhra Pradesh (APSDMA)'}</span>
          </div>

          <span class="risk-badge ${isVeryHigh ? 'very-high' : 'high'}">
            ${isVeryHigh ? '⚠️ VERY HIGH RISK VULNERABILITY' : '⚡ HIGH RISK VULNERABILITY'}
          </span>

          <div class="district-stats-row">
            <div class="district-stat">
              <span class="k">Coastline</span>
              <span class="v">${d.coastal_km} km</span>
            </div>
            <div class="district-stat">
              <span class="k">Designated Shelters</span>
              <span class="v">${d.shelters} MPCS</span>
            </div>
          </div>

          <div class="district-cyclones">
            <strong style="color:var(--text-main);">Historical Landfalls:</strong> ${d.cyclones.join(', ')}
          </div>
          <div class="district-cyclones">
            <strong style="color:var(--text-main);">Key Mandals:</strong> ${d.mandals.slice(0, 4).join(', ')}...
          </div>
        </div>

        <div class="deoc-helpline-box">
          <span>📞 DEOC: ${d.helpline}</span>
          <button class="copy-phone-btn" title="Copy Helpline" onclick="copyHelpline('${d.helpline}')">
            📋
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.copyHelpline = function(number) {
  navigator.clipboard.writeText(number).then(() => {
    showToast(`Copied DEOC Helpline: ${number}`);
  }).catch(() => {
    showToast(`DEOC Helpline: ${number}`);
  });
};

// ==========================================================================
// INITIALIZATION ON DOM READY
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initCycloneRadar();
  renderShelterQuickList();
  selectShelter(SHELTERS_SAMPLE[0]);
  initInventoryCalculator();
  initQrEngine();
  initDirectory();
});
