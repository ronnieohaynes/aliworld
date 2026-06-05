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
    { x: 22, y: 348, width: 57, height: 35 },
    { x: 232, y: 348, width: 11, height: 37 },
    { x: 243, y: 348, width: 36, height: 37 },
    { x: 296, y: 348, width: 40, height: 35 },
    { x: 478, y: 356, width: 25, height: 29 },
    { x: 686, y: 358, width: 40, height: 27 },
    { x: 779, y: 358, width: 29, height: 21 },
    { x: 946, y: 350, width: 51, height: 40 },
    { x: 1171, y: 355, width: 29, height: 24 },
    { x: 0, y: 409, width: 50, height: 253 },
    { x: 89, y: 434, width: 111, height: 57 },
    { x: 323, y: 423, width: 116, height: 67 },
    { x: 729, y: 433, width: 113, height: 60 },
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
