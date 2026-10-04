// Maneuver and coordinate normalization helper (FR-D1, FR-D3)

export function roundTo5Dp(num) {
  return Math.round(num * 1e5) / 1e5;
}

export function roundLngLat(lngLat) {
  return [roundTo5Dp(lngLat[0]), roundTo5Dp(lngLat[1])];
}

export function roundLineStringCoordinates(coords) {
  return coords.map((c) => roundLngLat(c));
}

/**
 * Maps OSRM step maneuver to standard Maneuver enum
 */
export function normalizeOsrmManeuver(step) {
  const type = step.maneuver?.type;
  const modifier = step.maneuver?.modifier;

  if (type === "depart") return "depart";
  if (type === "arrive") return "arrive";
  if (type === "roundabout" || type === "rotary") return "roundabout";

  if (modifier === "uturn") return "uturn";
  if (modifier === "sharp right") return "sharp-right";
  if (modifier === "right") return "turn-right";
  if (modifier === "slight right") return "slight-right";
  if (modifier === "straight") return "straight";
  if (modifier === "slight left") return "slight-left";
  if (modifier === "left") return "turn-left";
  if (modifier === "sharp left") return "sharp-left";

  if (type === "fork" || type === "end of road") {
    if (modifier?.includes("left")) return "keep-left";
    if (modifier?.includes("right")) return "keep-right";
  }

  return "straight";
}

/**
 * Maps OpenRouteService step type to standard Maneuver enum
 */
export function normalizeOrsManeuver(orsType) {
  switch (Number(orsType)) {
    case 0:
      return "turn-left";
    case 1:
      return "turn-right";
    case 2:
      return "sharp-left";
    case 3:
      return "sharp-right";
    case 4:
      return "slight-left";
    case 5:
      return "slight-right";
    case 6:
      return "straight";
    case 7:
    case 8:
      return "roundabout";
    case 9:
      return "uturn";
    case 10:
      return "depart";
    case 11:
      return "arrive";
    case 12:
      return "keep-left";
    case 13:
      return "keep-right";
    default:
      return "other";
  }
}
