/**
 * Apple Liquid Glass (WWDC25) Design Tokens
 * Master specification for floating, light-bending functional layer
 */

export interface LiquidGlassTokens {
  blurControl: string;
  blurSurface: string;
  blurClear: string;
  saturate: string;
  tintLight: string;
  tintDark: string;
  tintClear: string;
  scrimClear: string;
  tintPrimary: string;
  shadowControl: string;
  shadowSurface: string;
  radiusSurface: string;
  radiusControl: string;
  easeSpring: string;
  easeFallback: string;
}

export const LG_TOKENS: LiquidGlassTokens = {
  blurControl: "16px",
  blurSurface: "24px",
  blurClear: "6px",
  saturate: "180%",
  tintLight: "rgb(255 255 255 / 0.88)",
  tintDark: "rgb(255 255 255 / 0.80)",
  tintClear: "rgb(255 255 255 / 0.45)",
  scrimClear: "rgb(0 0 0 / 0.12)",
  tintPrimary: "#007AFF",
  shadowControl: "0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px -4px rgba(0, 0, 0, 0.08)",
  shadowSurface: "0 2px 8px rgba(0, 0, 0, 0.06), 0 20px 48px -6px rgba(0, 0, 0, 0.12)",
  radiusSurface: "20px",
  radiusControl: "9999px",
  easeSpring:
    "linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 25.3%, 0.849 31.5%, 0.937 38.1%, 0.968 41.8%, 0.991 45.7%, 1.006 50.1%, 1.015 55%, 1.017 60.5%, 1.014 66.8%, 1.001 80.8%, 0.996 90.2%, 1)",
  easeFallback: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};
