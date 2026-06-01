// Collision zones for ALIWORLD maps.
// Each zone is { x, y, width, height } in world coordinates (pixels).
// Generated from magenta-painted collision overlay. Map: 1254x1254.

export interface CollisionZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const COLLISION_ZONES: Record<string, CollisionZone[]> = {
  five: [
    { x: 12, y: 265, width: 1242, height: 62 },
    { x: 1161, y: 347, width: 54, height: 32 },
    { x: 22, y: 348, width: 57, height: 35 },
    { x: 228, y: 348, width: 51, height: 37 },
    { x: 296, y: 348, width: 40, height: 35 },
    { x: 930, y: 350, width: 86, height: 40 },
    { x: 460, y: 356, width: 52, height: 29 },
    { x: 684, y: 358, width: 48, height: 36 },
    { x: 779, y: 358, width: 29, height: 20 },
    { x: 0, y: 410, width: 50, height: 252 },
    { x: 73, y: 412, width: 148, height: 83 },
    { x: 704, y: 412, width: 156, height: 81 },
    { x: 1204, y: 416, width: 50, height: 227 },
    { x: 313, y: 423, width: 133, height: 67 },
    { x: 940, y: 427, width: 158, height: 56 },
    { x: 460, y: 639, width: 65, height: 34 },
    { x: 636, y: 660, width: 618, height: 86 },
    { x: 0, y: 666, width: 554, height: 96 },
    { x: 2, y: 876, width: 1252, height: 61 },
  ],
  // future maps: southside: [...], hillside: [...], etc.
};

export function getCollisionZones(mapId: string): CollisionZone[] {
  return COLLISION_ZONES[mapId] ?? [];
}