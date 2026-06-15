// ALIWORLD collision zones for the SOUTHSIDE city map
// Auto-extracted from the magenta-painted collision overlay.
// Source map: 1254x1254 px. Zones are in world pixel coordinates,
// assuming the map renders at native size with top-left at world (0,0).

export interface CollisionZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SOUTHSIDE_MAP_SIZE = { width: 1254, height: 1254 };

// Darkline entrance stairwell on this map.
export const SOUTHSIDE_DARKLINE_ZONE = { x: 150, y: 960, width: 112, height: 96 };

/** Center x of the blue store corner entrance (brick door + awning). */
export const SOUTHSIDE_STORE_DOOR_X = 669;

// Street-level corner door — not the upper facade / side cult entrance.
export const SOUTHSIDE_ENTRANCE_ZONE = {
  x: 632,
  y: 812,
  width: 72,
  height: 56,
};

// Player spawns here when arriving via Darkline (threshold floor inside entrance).
export const SOUTHSIDE_DARKLINE_ARRIVAL = { x: 210, y: 1016 };

export const SOUTHSIDE_COLLISION_ZONES: CollisionZone[] = [
  { x: 0, y: 344, width: 1254, height: 136 },
  { x: 0, y: 488, width: 160, height: 544 },
  { x: 584, y: 496, width: 670, height: 256 },
  { x: 160, y: 624, width: 96, height: 8 },
  { x: 160, y: 632, width: 104, height: 280 },
  { x: 608, y: 760, width: 40, height: 8 },
  { x: 600, y: 768, width: 56, height: 48 },
  { x: 736, y: 768, width: 518, height: 72 },
  { x: 728, y: 776, width: 8, height: 56 },
  { x: 808, y: 848, width: 446, height: 48 },
  { x: 800, y: 856, width: 8, height: 40 },
  { x: 264, y: 880, width: 24, height: 32 },
  { x: 240, y: 912, width: 48, height: 104 },
  { x: 0, y: 1032, width: 152, height: 8 },
  { x: 0, y: 1120, width: 1254, height: 48 },
];

export function hitsCollision(
  x: number, y: number, w: number, h: number,
  zones: CollisionZone[]
): boolean {
  for (const z of zones) {
    if (x < z.x + z.width && x + w > z.x && y < z.y + z.height && y + h > z.y) {
      return true;
    }
  }
  return false;
}
