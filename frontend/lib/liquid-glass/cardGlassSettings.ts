/**
 * Apple Liquid Glass Material & Shader Tokens Specification
 * Supports real-time optical refraction, chromatic dispersion, bezel spread,
 * specular reflection, and complete customization controls.
 */

export interface CardGlassSettings {
  // Preset Name
  preset: "Apple Glass" | "Clear Glass" | "Frosted Glass" | "Crystal Glass" | "Deep Glass" | "Disaster Command" | "Custom";

  // Optics & Glass Tint
  refraction: number;          // 0 to 60 (Snell's Law displacement power)
  bezelWidth: number;          // 8px to 64px (convex rim thickness)
  lensBlur: number;            // 0px to 32px (background lens diffusion)
  specularSheen: number;       // 0.0 to 1.0 (light reflection gloss)
  distortion: number;          // 0.1 to 2.5 (optical warp magnitude)
  dispersion: number;          // 0.0 to 0.25 (chromatic prism separation)
  glassOpacity: number;        // 0.0 to 1.0 (material base opacity)
  tintColor: string;           // Hex or rgb (e.g. #ffffff, #0284c7, #0f172a)
  tintIntensity: number;       // 0.0 to 0.8 (tint blend alpha)
  colorSaturation: number;     // 100% to 250% (backdrop color enhancement)

  // Light & Reflection
  reflection: number;          // 0.0 to 1.0 (surface reflectivity)
  highlightIntensity: number;  // 0.0 to 1.0 (optical rim light boost)
  highlightWidth: number;      // 0.5px to 3.0px (rim border stroke)
  lightDirection: number;      // -180deg to 180deg (sun / incident angle)
  ambientLight: number;        // 0.0 to 1.0 (diffuse environment light)
  edgeHighlight: number;       // 0.0 to 1.0 (specular bevel glow)

  // Depth & Shadow
  shadowOpacity: number;       // 0.0 to 1.0 (ambient drop shadow strength)
  shadowBlur: number;          // 0px to 64px (drop shadow softness)
  shadowSpread: number;        // -20px to 20px (drop shadow footprint)
  glassElevation: number;      // 0px to 40px (perceived float height)
  ambientGlow: number;         // 0.0 to 1.0 (caustic rim underglow)
  glowBlur: number;            // 0px to 60px (underglow radius)

  // Interaction
  hoverBrightness: number;     // 100% to 150% (pointer hover luminosity)
  hoverGlow: number;           // 0.0 to 1.0 (interactive bloom)
  hoverScale: number;          // 1.00 to 1.04 (hover lift scale)
  pressScale: number;          // 0.96 to 1.00 (active press compression)
  interactionLight: boolean;   // true / false (pointer-following highlight)
  animationSpeed: number;      // 100ms to 600ms (transition physics)

  // Advanced Glass
  transmission: number;        // 0.50 to 1.00 (light transmission ratio)
  frost: number;               // 0.0 to 1.0 (microsurface roughness)
  iridescence: number;         // 0.0 to 1.0 (thin-film interference)
  chromaticAberration: number; // 0px to 10px (RGB fringe separation)
  edgeRefraction: number;      // 0.0 to 1.0 (bezel normal deflection)
  surfaceNoise: number;        // 0.0 to 1.0 (subtle sandblasted grain)
  glassThickness: number;      // 1mm to 20mm (physical lens thickness)
  opticalDistortion: number;   // 0.0 to 1.0 (wave deflection factor)
}

export const PRESET_APPLE_GLASS: CardGlassSettings = {
  preset: "Apple Glass",
  refraction: 40,
  bezelWidth: 31,
  lensBlur: 5,
  specularSheen: 0.45,
  distortion: 1.0,
  dispersion: 0.08,
  glassOpacity: 0.88,
  tintColor: "#ffffff",
  tintIntensity: 0.08,
  colorSaturation: 160,

  reflection: 0.45,
  highlightIntensity: 0.85,
  highlightWidth: 1.5,
  lightDirection: 35,
  ambientLight: 0.15,
  edgeHighlight: 0.40,

  shadowOpacity: 0.35,
  shadowBlur: 40,
  shadowSpread: -8,
  glassElevation: 16,
  ambientGlow: 0.10,
  glowBlur: 31,

  hoverBrightness: 108,
  hoverGlow: 0.20,
  hoverScale: 1.008,
  pressScale: 0.985,
  interactionLight: true,
  animationSpeed: 260,

  transmission: 0.92,
  frost: 0.0,
  iridescence: 0.0,
  chromaticAberration: 4,
  edgeRefraction: 0.85,
  surfaceNoise: 0.0,
  glassThickness: 4,
  opticalDistortion: 0.80,
};

export const PRESET_CLEAR_GLASS: CardGlassSettings = {
  preset: "Clear Glass",
  refraction: 25,
  bezelWidth: 20,
  lensBlur: 3,
  specularSheen: 0.70,
  distortion: 0.6,
  dispersion: 0.04,
  glassOpacity: 0.95,
  tintColor: "#ffffff",
  tintIntensity: 0.03,
  colorSaturation: 135,

  reflection: 0.60,
  highlightIntensity: 0.95,
  highlightWidth: 1.25,
  lightDirection: 45,
  ambientLight: 0.10,
  edgeHighlight: 0.50,

  shadowOpacity: 0.22,
  shadowBlur: 24,
  shadowSpread: -4,
  glassElevation: 10,
  ambientGlow: 0.06,
  glowBlur: 20,

  hoverBrightness: 105,
  hoverGlow: 0.15,
  hoverScale: 1.006,
  pressScale: 0.988,
  interactionLight: true,
  animationSpeed: 240,

  transmission: 0.98,
  frost: 0.0,
  iridescence: 0.0,
  chromaticAberration: 2,
  edgeRefraction: 0.70,
  surfaceNoise: 0.0,
  glassThickness: 2,
  opticalDistortion: 0.50,
};

export const PRESET_FROSTED_GLASS: CardGlassSettings = {
  preset: "Frosted Glass",
  refraction: 20,
  bezelWidth: 38,
  lensBlur: 16,
  specularSheen: 0.25,
  distortion: 0.45,
  dispersion: 0.03,
  glassOpacity: 0.82,
  tintColor: "#ffffff",
  tintIntensity: 0.16,
  colorSaturation: 175,

  reflection: 0.30,
  highlightIntensity: 0.65,
  highlightWidth: 1.5,
  lightDirection: 25,
  ambientLight: 0.25,
  edgeHighlight: 0.30,

  shadowOpacity: 0.30,
  shadowBlur: 36,
  shadowSpread: -6,
  glassElevation: 14,
  ambientGlow: 0.15,
  glowBlur: 40,

  hoverBrightness: 110,
  hoverGlow: 0.25,
  hoverScale: 1.008,
  pressScale: 0.985,
  interactionLight: false,
  animationSpeed: 300,

  transmission: 0.85,
  frost: 0.65,
  iridescence: 0.0,
  chromaticAberration: 1,
  edgeRefraction: 0.50,
  surfaceNoise: 0.22,
  glassThickness: 6,
  opticalDistortion: 0.40,
};

export const PRESET_CRYSTAL_GLASS: CardGlassSettings = {
  preset: "Crystal Glass",
  refraction: 55,
  bezelWidth: 44,
  lensBlur: 4,
  specularSheen: 0.90,
  distortion: 1.45,
  dispersion: 0.16,
  glassOpacity: 0.92,
  tintColor: "#e0f2fe",
  tintIntensity: 0.06,
  colorSaturation: 190,

  reflection: 0.80,
  highlightIntensity: 1.0,
  highlightWidth: 2.0,
  lightDirection: -40,
  ambientLight: 0.20,
  edgeHighlight: 0.85,

  shadowOpacity: 0.42,
  shadowBlur: 48,
  shadowSpread: -8,
  glassElevation: 20,
  ambientGlow: 0.25,
  glowBlur: 36,

  hoverBrightness: 112,
  hoverGlow: 0.35,
  hoverScale: 1.012,
  pressScale: 0.982,
  interactionLight: true,
  animationSpeed: 250,

  transmission: 0.95,
  frost: 0.0,
  iridescence: 0.45,
  chromaticAberration: 8,
  edgeRefraction: 1.0,
  surfaceNoise: 0.0,
  glassThickness: 8,
  opticalDistortion: 1.0,
};

export const PRESET_DEEP_GLASS: CardGlassSettings = {
  preset: "Deep Glass",
  refraction: 36,
  bezelWidth: 32,
  lensBlur: 10,
  specularSheen: 0.35,
  distortion: 0.9,
  dispersion: 0.06,
  glassOpacity: 0.85,
  tintColor: "#0f172a",
  tintIntensity: 0.32,
  colorSaturation: 150,

  reflection: 0.40,
  highlightIntensity: 0.70,
  highlightWidth: 1.25,
  lightDirection: 50,
  ambientLight: 0.12,
  edgeHighlight: 0.45,

  shadowOpacity: 0.55,
  shadowBlur: 50,
  shadowSpread: -6,
  glassElevation: 22,
  ambientGlow: 0.18,
  glowBlur: 35,

  hoverBrightness: 114,
  hoverGlow: 0.30,
  hoverScale: 1.01,
  pressScale: 0.985,
  interactionLight: true,
  animationSpeed: 280,

  transmission: 0.80,
  frost: 0.0,
  iridescence: 0.15,
  chromaticAberration: 3,
  edgeRefraction: 0.80,
  surfaceNoise: 0.0,
  glassThickness: 5,
  opticalDistortion: 0.75,
};

export const PRESET_DISASTER_COMMAND: CardGlassSettings = {
  preset: "Disaster Command",
  refraction: 42,
  bezelWidth: 36,
  lensBlur: 6,
  specularSheen: 0.60,
  distortion: 1.1,
  dispersion: 0.09,
  glassOpacity: 0.90,
  tintColor: "#0284c7",
  tintIntensity: 0.10,
  colorSaturation: 180,

  reflection: 0.55,
  highlightIntensity: 0.90,
  highlightWidth: 1.75,
  lightDirection: -45,
  ambientLight: 0.18,
  edgeHighlight: 0.65,

  shadowOpacity: 0.40,
  shadowBlur: 42,
  shadowSpread: -7,
  glassElevation: 18,
  ambientGlow: 0.28,
  glowBlur: 45,

  hoverBrightness: 110,
  hoverGlow: 0.32,
  hoverScale: 1.01,
  pressScale: 0.984,
  interactionLight: true,
  animationSpeed: 260,

  transmission: 0.90,
  frost: 0.0,
  iridescence: 0.20,
  chromaticAberration: 5,
  edgeRefraction: 0.90,
  surfaceNoise: 0.05,
  glassThickness: 5,
  opticalDistortion: 0.85,
};

export const CARD_GLASS_PRESETS: Record<string, CardGlassSettings> = {
  "Apple Glass": PRESET_APPLE_GLASS,
  "Clear Glass": PRESET_CLEAR_GLASS,
  "Frosted Glass": PRESET_FROSTED_GLASS,
  "Crystal Glass": PRESET_CRYSTAL_GLASS,
  "Deep Glass": PRESET_DEEP_GLASS,
  "Disaster Command": PRESET_DISASTER_COMMAND,
};

/**
 * Utility to convert hex color to r, g, b tuple
 */
export function hexToRgb(hex: string): [number, number, number] {
  let cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num) || cleaned.length !== 6) {
    return [255, 255, 255];
  }
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Applies CardGlassSettings to document.documentElement CSS variables
 */
export function applyCardGlassVariables(settings: CardGlassSettings) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const [r, g, b] = hexToRgb(settings.tintColor);

  // Optics & Glass Tint
  root.style.setProperty("--glass-refraction", `${settings.refraction}`);
  root.style.setProperty("--glass-refraction-active", `${settings.refraction}`);
  root.style.setProperty("--glass-bezel-width", `${settings.bezelWidth}px`);
  root.style.setProperty("--glass-bezel-width-active", `${settings.bezelWidth}px`);
  root.style.setProperty("--bezel-width", `${settings.bezelWidth}px`);
  root.style.setProperty("--glass-lens-blur", `${settings.lensBlur}px`);
  root.style.setProperty("--glass-lens-blur-active", `${settings.lensBlur}px`);
  root.style.setProperty("--lens-blur", `${settings.lensBlur}px`);
  root.style.setProperty("--glass-specular-sheen", `${settings.specularSheen}`);
  root.style.setProperty("--glass-distortion", `${settings.distortion}`);
  root.style.setProperty("--glass-dispersion", `${settings.dispersion}`);
  root.style.setProperty("--glass-opacity", `${settings.glassOpacity}`);
  root.style.setProperty("--glass-tint-rgb", `${r}, ${g}, ${b}`);
  root.style.setProperty("--glass-tint", `rgba(${r}, ${g}, ${b}, ${settings.tintIntensity})`);
  root.style.setProperty("--glass-saturation", `${settings.colorSaturation}%`);
  root.style.setProperty("--glass-brightness", `108%`);

  // Light & Reflection
  root.style.setProperty("--glass-reflection", `${settings.reflection}`);
  root.style.setProperty("--glass-highlight-intensity", `${settings.highlightIntensity}`);
  root.style.setProperty("--glass-highlight-width", `${settings.highlightWidth}px`);
  root.style.setProperty("--glass-light-direction", `${settings.lightDirection}deg`);
  root.style.setProperty("--glass-ambient-light", `${settings.ambientLight}`);
  root.style.setProperty("--glass-edge-highlight", `rgba(255, 255, 255, ${settings.edgeHighlight})`);
  root.style.setProperty("--glass-optical-border", `rgba(${r}, ${g}, ${b}, ${(settings.highlightIntensity * 0.45).toFixed(2)})`);

  // Depth & Shadow
  root.style.setProperty("--glass-shadow-opacity", `${settings.shadowOpacity}`);
  root.style.setProperty("--glass-shadow-blur", `${settings.shadowBlur}px`);
  root.style.setProperty("--glass-shadow-spread", `${settings.shadowSpread}px`);
  root.style.setProperty("--glass-elevation", `${settings.glassElevation}px`);
  root.style.setProperty("--glass-ambient-glow", `${settings.ambientGlow}`);
  root.style.setProperty("--glass-glow-blur", `${settings.glowBlur}px`);

  // Interaction
  root.style.setProperty("--glass-hover-brightness", `${settings.hoverBrightness}%`);
  root.style.setProperty("--glass-hover-glow", `${settings.hoverGlow}`);
  root.style.setProperty("--glass-hover-scale", `${settings.hoverScale}`);
  root.style.setProperty("--glass-press-scale", `${settings.pressScale}`);
  root.style.setProperty("--glass-transition", `all ${settings.animationSpeed}ms cubic-bezier(0.16, 1, 0.3, 1)`);
  root.style.setProperty("--glass-interaction-light", settings.interactionLight ? "1" : "0");

  // Advanced Glass
  root.style.setProperty("--glass-transmission", `${settings.transmission}`);
  root.style.setProperty("--glass-frost", `${settings.frost}`);
  root.style.setProperty("--glass-iridescence", `${settings.iridescence}`);
  root.style.setProperty("--glass-chromatic-aberration", `${settings.chromaticAberration}px`);
  root.style.setProperty("--glass-thickness", `${settings.glassThickness}mm`);
}
