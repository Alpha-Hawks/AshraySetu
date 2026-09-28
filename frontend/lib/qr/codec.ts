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
}

/**
 * Encodes household details into an ultra-compact pipe-delimited payload
 * e.g., V1|OD-KEN-RAJ-001|c4b1|5|2|2|1|0|2|P1_PREG|Pravat|Talachua
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
  ];
  return parts.join("|");
}

/**
 * Decodes a scanned pipe-delimited payload back into structured data
 */
export function decodeQRPayload(rawText: string): QRPayloadData | null {
  try {
    const parts = rawText.split("|");
    if (parts.length < 10) return null;

    return {
      version: parts[0],
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
    };
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
