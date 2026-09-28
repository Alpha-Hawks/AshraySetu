declare module "jsqr" {
  export interface QRCodePoint {
    x: number;
    y: number;
  }
  export interface QRCodeResult {
    binaryData: number[];
    data: string;
    chunks: any[];
    location: {
      topRightCorner: QRCodePoint;
      topLeftCorner: QRCodePoint;
      bottomRightCorner: QRCodePoint;
      bottomLeftCorner: QRCodePoint;
    };
  }
  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: {
      inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst";
    }
  ): QRCodeResult | null;
}
