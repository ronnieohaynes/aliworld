// Collision zones for ALIWORLD maps.
// Each zone is { x, y, width, height } in world coordinates (pixels).
// Generated from magenta-painted collision overlay. Map: 1254x1254.

export interface CollisionZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Oceanview Gym left door gap, matches `gymEntrance.ts` entrance trigger (48px wide). */
const OCEANVIEW_GYM_DOOR_LEFT = 727
const OCEANVIEW_GYM_DOOR_RIGHT = 775
const OCEANVIEW_GYM_DOOR_LINTEL_BOTTOM_Y = 300

export const COLLISION_ZONES: Record<string, CollisionZone[]> = {
  five: [
    // North storefront band, split so the gym door (x 727–775) stays walkable.
    { x: 12, y: 265, width: OCEANVIEW_GYM_DOOR_LEFT - 12, height: 62 },
    { x: OCEANVIEW_GYM_DOOR_RIGHT, y: 265, width: 1254 - OCEANVIEW_GYM_DOOR_RIGHT, height: 62 },
    // Lintel above Oceanview Gym door, blocks running past north through the facade gap.
    {
      x: OCEANVIEW_GYM_DOOR_LEFT,
      y: 265,
      width: OCEANVIEW_GYM_DOOR_RIGHT - OCEANVIEW_GYM_DOOR_LEFT,
      height: OCEANVIEW_GYM_DOOR_LINTEL_BOTTOM_Y - 265,
    },
    { x: 22, y: 348, width: 57, height: 35 },
    { x: 232, y: 348, width: 11, height: 37 },
    { x: 243, y: 348, width: 36, height: 37 },
    { x: 296, y: 348, width: 40, height: 35 },
    { x: 478, y: 356, width: 25, height: 29 },
    { x: 946, y: 350, width: 51, height: 40 },
    { x: 1171, y: 355, width: 29, height: 24 },
    { x: 0, y: 409, width: 50, height: 253 },
    { x: 89, y: 434, width: 111, height: 57 },
    { x: 323, y: 423, width: 116, height: 67 },
    // Sidewalk band east of gym door, west segment removed for door approach.
    { x: OCEANVIEW_GYM_DOOR_RIGHT, y: 433, width: 842 - OCEANVIEW_GYM_DOOR_RIGHT, height: 60 },
    { x: 956, y: 442, width: 118, height: 41 },
    { x: 1204, y: 415, width: 50, height: 228 },
    { x: 460, y: 639, width: 53, height: 34 },
    { x: 636, y: 663, width: 618, height: 83 },
    { x: 0, y: 666, width: 554, height: 96 },
    { x: 1163, y: 678, width: 49, height: 21 },
    { x: 2, y: 876, width: 1252, height: 61 },
  ],
  // future maps: southside: [...], hillside: [...], etc.
};

export function getCollisionZones(mapId: string): CollisionZone[] {
  return COLLISION_ZONES[mapId] ?? [];
}
