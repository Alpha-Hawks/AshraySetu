import QRCode from "qrcode";

export interface QRPayloadData {
  version: string;
  shelterId: string;
  shortRef: string;
  totalMembers: number;
  maleCount: number;
  femaleCount: number;
  infantCount: number;
  elderlyCount: number;
  livestockCount: number;
  triageCode: string;
  headName?: string;
  hamletName?: string;
  createdAt?: number;
}

/**
 * Encodes household details into an ultra-compact pipe-delimited payload
 * e.g., V1|OD-KEN-RAJ-001|c4b1|5|2|2|1|0|2|P1_PREG|Pravat|Talachua|1727517600000
 */
export function encodeQRPayload(data: QRPayloadData): string {
  const parts = [
    data.version || "V1",
    data.shelterId,
    data.shortRef,
    data.totalMembers,
    data.maleCount,
    data.femaleCount,
    data.infantCount,
    data.elderlyCount,
    data.livestockCount,
    data.triageCode,
    (data.headName || "").replace(/\|/g, ""),
    (data.hamletName || "").replace(/\|/g, ""),
    data.createdAt || Date.now(),
  ];
  return parts.join("|");
}

/**
 * Decodes a scanned pipe-delimited payload back into structured data
 */
export function decodeQRPayload(rawInput: string): QRPayloadData | null {
  try {
    let clean = (rawInput || "").trim();

    // Check if input is base64 encoded
    if (!clean.includes("|") && clean.length > 20) {
      try {
        const decodedB64 = atob(clean);
        if (decodedB64.includes("|")) {
          clean = decodedB64;
        }
      } catch {
        // Not valid base64, continue
      }
    }

    // Check if input is JSON
    if (clean.startsWith("{") && clean.endsWith("}")) {
      try {
        const json = JSON.parse(clean);
        return {
          version: json.version || "V1",
          shelterId: json.shelterId || json.shelter_id || "OD-KEN-RAJ-001",
          shortRef: json.shortRef || json.id?.substring(0, 4) || "ref1",
          totalMembers: Number(json.totalMembers || json.total_members) || 1,
          maleCount: Number(json.maleCount || json.male_count) || 0,
          femaleCount: Number(json.femaleCount || json.female_count) || 0,
          infantCount: Number(json.infantCount || json.child_under_five_count) || 0,
          elderlyCount: Number(json.elderlyCount || json.elderly_above_sixty_count) || 0,
          livestockCount: Number(json.livestockCount || json.livestock_count) || 0,
          triageCode: json.triageCode || json.triage_code || "P3_STD",
          headName: json.headName || json.head_name || "Unknown",
          hamletName: json.hamletName || json.hamlet_name || "Coastal Hamlet",
          createdAt: json.createdAt || json.created_at || json.registered_at ? Number(json.createdAt || json.created_at || json.registered_at) : undefined,
        };
      } catch {
        // Continue to pipe check
      }
    }

    const parts = clean.split("|");
    if (parts.length >= 10) {
      const parsedCreatedAt = parts[12] ? parseInt(parts[12], 10) : undefined;
      return {
        version: parts[0] || "V1",
        shelterId: parts[1],
        shortRef: parts[2],
        totalMembers: parseInt(parts[3], 10) || 1,
        maleCount: parseInt(parts[4], 10) || 0,
        femaleCount: parseInt(parts[5], 10) || 0,
        infantCount: parseInt(parts[6], 10) || 0,
        elderlyCount: parseInt(parts[7], 10) || 0,
        livestockCount: parseInt(parts[8], 10) || 0,
        triageCode: parts[9],
        headName: parts[10] || "Unknown",
        hamletName: parts[11] || "Coastal Hamlet",
        createdAt: parsedCreatedAt && !isNaN(parsedCreatedAt) ? parsedCreatedAt : undefined,
      };
    }

    return null;
  } catch (err) {
    console.error("Failed to decode QR code payload", err);
    return null;
  }
}

/**
 * Generates an SVG or Data URL QR code from the encoded payload
 */
export async function generateQRCodeDataURL(payload: string): Promise<string> {
  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 6,
    color: {
      dark: "#0F172A", // Slate-900
      light: "#FFFFFF",
    },
  });
}
