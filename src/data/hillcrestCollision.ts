// ALIWORLD collision zones for the HILLCREST city map
// Auto-extracted from the magenta-painted collision overlay.
// Source map: 1122x1402 px. Zones are in world pixel coordinates,
// assuming the Hillcrest map renders at native size with top-left at world (0,0).

export interface CollisionZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const HILLCREST_MAP_SIZE = { width: 1122, height: 1402 };

export const HILLCREST_COLLISION_ZONES: CollisionZone[] = [
  { x: 200, y: 0, width: 216, height: 1402 },
  { x: 416, y: 0, width: 520, height: 72 },
  { x: 936, y: 16, width: 128, height: 816 },
  { x: 680, y: 72, width: 112, height: 96 },
  { x: 792, y: 72, width: 144, height: 8 },
  { x: 416, y: 80, width: 40, height: 64 },
  { x: 416, y: 144, width: 32, height: 8 },
  { x: 816, y: 144, width: 112, height: 24 },
  { x: 424, y: 160, width: 24, height: 32 },
  { x: 688, y: 168, width: 56, height: 32 },
  { x: 744, y: 168, width: 184, height: 80 },
  { x: 928, y: 176, width: 8, height: 64 },
  { x: 448, y: 184, width: 72, height: 8 },
  { x: 448, y: 192, width: 80, height: 128 },
  { x: 608, y: 192, width: 80, height: 128 },
  { x: 704, y: 224, width: 24, height: 24 },
  { x: 744, y: 248, width: 48, height: 56 },
  { x: 616, y: 320, width: 64, height: 8 },
  { x: 752, y: 320, width: 32, height: 264 },
  { x: 704, y: 384, width: 24, height: 16 },
  { x: 440, y: 432, width: 72, height: 120 },
  { x: 624, y: 432, width: 40, height: 120 },
  { x: 792, y: 432, width: 136, height: 112 },
  { x: 704, y: 512, width: 24, height: 32 },
  { x: 624, y: 552, width: 32, height: 8 },
  { x: 448, y: 600, width: 56, height: 8 },
  { x: 440, y: 608, width: 64, height: 112 },
  { x: 736, y: 608, width: 8, height: 56 },
  { x: 744, y: 608, width: 64, height: 240 },
  { x: 736, y: 680, width: 8, height: 48 },
  { x: 824, y: 696, width: 96, height: 48 },
  { x: 816, y: 704, width: 8, height: 40 },
  { x: 448, y: 720, width: 56, height: 8 },
  { x: 736, y: 736, width: 8, height: 112 },
  { x: 1064, y: 808, width: 58, height: 48 },
  { x: 888, y: 832, width: 56, height: 24 },
  { x: 616, y: 840, width: 48, height: 8 },
  { x: 448, y: 848, width: 64, height: 128 },
  { x: 608, y: 848, width: 64, height: 120 },
  { x: 696, y: 848, width: 32, height: 24 },
  { x: 760, y: 848, width: 32, height: 32 },
  { x: 1032, y: 888, width: 90, height: 424 },
  { x: 784, y: 912, width: 24, height: 176 },
  { x: 856, y: 1008, width: 24, height: 40 },
  { x: 904, y: 1040, width: 72, height: 48 },
  { x: 912, y: 1088, width: 56, height: 8 },
  { x: 608, y: 1096, width: 72, height: 120 },
  { x: 448, y: 1112, width: 56, height: 104 },
  { x: 1008, y: 1136, width: 24, height: 72 },
  { x: 696, y: 1144, width: 32, height: 16 },
  { x: 816, y: 1144, width: 72, height: 80 },
  { x: 448, y: 1216, width: 48, height: 8 },
  { x: 616, y: 1216, width: 64, height: 8 },
  { x: 752, y: 1248, width: 72, height: 32 },
  { x: 608, y: 1256, width: 72, height: 128 },
  { x: 440, y: 1264, width: 72, height: 104 },
  { x: 600, y: 1264, width: 8, height: 112 },
  { x: 744, y: 1304, width: 8, height: 40 },
  { x: 752, y: 1304, width: 280, height: 48 },
  { x: 728, y: 1360, width: 96, height: 40 },
  { x: 448, y: 1368, width: 64, height: 8 },
];

// Generic AABB test. If you already have a collision helper, reuse it and
// delete this one; just keep HILLCREST_COLLISION_ZONES and HILLCREST_MAP_SIZE.
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
