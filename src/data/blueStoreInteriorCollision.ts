// ALIWORLD collision zones for the BLUE STORE (Hillside Market) interior map
// Auto-extracted from the magenta-painted collision overlay.
// Source map: 1254x1254 px. Zones are in world pixel coordinates,
// assuming the map renders at native size with top-left at world (0,0).

export interface CollisionZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const BLUE_STORE_INTERIOR_MAP_SIZE = { width: 1254, height: 1254 };

/** Bitmap draw scale — environment is authored at native 1254; shrink to match Midnight. */
export const BLUE_STORE_INTERIOR_MAP_DRAW_SCALE = 0.55;

function scaleInteriorCoord(value: number): number {
  return Math.floor(value * BLUE_STORE_INTERIOR_MAP_DRAW_SCALE);
}

function scaleInteriorSize(value: number): number {
  return Math.max(1, Math.floor(value * BLUE_STORE_INTERIOR_MAP_DRAW_SCALE));
}

export function scaleBlueStoreInteriorZone(zone: CollisionZone): CollisionZone {
  return {
    x: scaleInteriorCoord(zone.x),
    y: scaleInteriorCoord(zone.y),
    width: scaleInteriorSize(zone.width),
    height: scaleInteriorSize(zone.height),
  };
}

export function scaleBlueStoreInteriorPoint(point: { x: number; y: number }): {
  x: number
  y: number
} {
  return { x: scaleInteriorCoord(point.x), y: scaleInteriorCoord(point.y) };
}

// Player spawn when entering from exterior (scaled world coordinates, map draw scale 0.55).
export const BLUE_STORE_INTERIOR_ENTRY = { x: 60, y: 506 };

// Exit door trigger in scaled world coordinates (map draw scale 0.55).
// Walking into this returns the player to the exterior Blue Store map.
export const BLUE_STORE_EXIT_ZONE = { x: 10, y: 555, width: 71, height: 88 };

export const BLUE_STORE_INTERIOR_COLLISION_ZONES: CollisionZone[] = [
  { x: 0, y: 320, width: 1254, height: 112 },
  { x: 1072, y: 448, width: 8, height: 72 },
  { x: 1080, y: 448, width: 168, height: 80 },
  { x: 0, y: 456, width: 136, height: 88 },
  { x: 136, y: 456, width: 8, height: 80 },
  { x: 216, y: 520, width: 776, height: 152 },
  { x: 1096, y: 544, width: 152, height: 16 },
  { x: 1120, y: 560, width: 48, height: 16 },
  { x: 1200, y: 560, width: 40, height: 16 },
  { x: 1112, y: 576, width: 136, height: 24 },
  { x: 1136, y: 616, width: 112, height: 24 },
  { x: 1160, y: 648, width: 24, height: 24 },
  { x: 1184, y: 648, width: 24, height: 56 },
  { x: 1216, y: 656, width: 32, height: 152 },
  { x: 0, y: 688, width: 88, height: 264 },
  { x: 1200, y: 712, width: 16, height: 16 },
  { x: 1248, y: 728, width: 6, height: 80 },
  { x: 1200, y: 736, width: 16, height: 72 },
  { x: 184, y: 752, width: 864, height: 96 },
  { x: 1048, y: 760, width: 8, height: 88 },
  { x: 0, y: 952, width: 80, height: 8 },
  { x: 160, y: 952, width: 40, height: 8 },
  { x: 320, y: 952, width: 128, height: 8 },
  { x: 456, y: 952, width: 104, height: 8 },
  { x: 568, y: 952, width: 40, height: 8 },
  { x: 648, y: 952, width: 32, height: 8 },
  { x: 704, y: 952, width: 104, height: 8 },
  { x: 824, y: 952, width: 64, height: 8 },
  { x: 992, y: 952, width: 64, height: 8 },
  { x: 144, y: 960, width: 8, height: 112 },
  { x: 152, y: 960, width: 936, height: 120 },
  { x: 0, y: 1104, width: 72, height: 136 },
];

// Generic AABB test. Reuse your existing helper if one exists.
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
