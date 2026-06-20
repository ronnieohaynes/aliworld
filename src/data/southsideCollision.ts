// ALIWORLD collision zones for the SOUTHSIDE city map
// Approximated from the magenta-painted collision overlay (re-drawn layout).
// Source map: 1254x1254 px. Zones are in world pixel coordinates,
// assuming the map renders at native size with top-left at world (0,0).
// NOTE: coordinates are estimated from the overlay image, expect to
// fine-tune in-game.

export interface CollisionZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SOUTHSIDE_MAP_SIZE = { width: 1254, height: 1254 };

// Darkline entrance stairwell on this map (purple zone).
export const SOUTHSIDE_DARKLINE_ZONE = { x: 330, y: 965, width: 75, height: 95 };

/** Center x of the blue store corner entrance (yellow door zone). */
export const SOUTHSIDE_STORE_DOOR_X = 1029;

// Blue store entrance, yellow door transition zone.
export const SOUTHSIDE_ENTRANCE_ZONE = {
  x: 1000,
  y: 895,
  width: 58,
  height: 60,
};

// Default spawn point on this map (orange marker).
export const SOUTHSIDE_DARKLINE_ARRIVAL = { x: 500, y: 1027 };

export const SOUTHSIDE_COLLISION_ZONES: CollisionZone[] = [
  // Top street band
  { x: 0, y: 396, width: 1254, height: 98 },
  // Extra depth on the far-left corner of the top street
  { x: 0, y: 494, width: 190, height: 61 },
  // Vertical block beside the small building (left side)
  { x: 185, y: 555, width: 50, height: 260 },
  // Bottom-left block under the small building
  { x: 0, y: 718, width: 235, height: 97 },
  // Octagon-shaped obstacle, approximated with two stacked rects
  { x: 250, y: 712, width: 155, height: 103 },
  { x: 230, y: 815, width: 170, height: 80 },
  // Large building block (right side), split to leave the door gap (x 1000-1058) walkable
  { x: 745, y: 487, width: 255, height: 481 },
  { x: 1058, y: 487, width: 32, height: 481 },
  // Lintel above the blue store door, blocks the gap above doorway height
  { x: 1000, y: 487, width: 58, height: 408 },
  // Stepped facade connecting building to parking lot
  { x: 600, y: 790, width: 145, height: 105 },
  // Barber pole shaft, extends the facade collision up to block its upper portion
  { x: 645, y: 575, width: 105, height: 215 },
  // Light pole / sign base (collision under the cyan occlusion post)
  { x: 452, y: 930, width: 53, height: 45 },
  // Right-edge extension along the building
  { x: 1090, y: 860, width: 164, height: 140 },
  // Darkline structure walls (around the purple trigger zone)
  { x: 290, y: 920, width: 40, height: 140 },
  { x: 405, y: 920, width: 15, height: 140 },
  { x: 290, y: 920, width: 130, height: 45 },
  // Small block left of the darkline structure
  { x: 198, y: 990, width: 34, height: 50 },
  // Bottom street band
  { x: 0, y: 1090, width: 1254, height: 164 },
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
