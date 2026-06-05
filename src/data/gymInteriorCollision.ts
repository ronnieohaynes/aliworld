// Oceanview Gym interior — walkable ring around the boxing ring (native 1224×1224 art).

export interface CollisionZone {
  x: number
  y: number
  width: number
  height: number
}

export const FIVE_GYM_INTERIOR_MAP_SIZE = { width: 1224, height: 1224 }

/** Match blue-store interior — Midnight-sized gameplay coords. */
export const FIVE_GYM_INTERIOR_MAP_DRAW_SCALE = 0.55

function scaleInteriorCoord(value: number): number {
  return Math.floor(value * FIVE_GYM_INTERIOR_MAP_DRAW_SCALE)
}

function scaleInteriorSize(value: number): number {
  return Math.max(1, Math.floor(value * FIVE_GYM_INTERIOR_MAP_DRAW_SCALE))
}

export function scaleFiveGymInteriorZone(zone: CollisionZone): CollisionZone {
  return {
    x: scaleInteriorCoord(zone.x),
    y: scaleInteriorCoord(zone.y),
    width: scaleInteriorSize(zone.width),
    height: scaleInteriorSize(zone.height),
  }
}

export function scaleFiveGymInteriorPoint(point: { x: number; y: number }): {
  x: number
  y: number
} {
  return { x: scaleInteriorCoord(point.x), y: scaleInteriorCoord(point.y) }
}

/** Just inside the south door. */
export const FIVE_GYM_INTERIOR_ENTRY = scaleFiveGymInteriorPoint({ x: 612, y: 1080 })

/** Exit trigger at the south doorway (native coords). */
export const FIVE_GYM_EXIT_ZONE = { x: 552, y: 1148, width: 120, height: 76 }

/** Simple outer shell + center ring collision (native map pixels). */
export const FIVE_GYM_INTERIOR_COLLISION_ZONES: CollisionZone[] = [
  { x: 0, y: 0, width: 1224, height: 96 },
  { x: 0, y: 96, width: 96, height: 1128 },
  { x: 1128, y: 96, width: 96, height: 1128 },
  { x: 96, y: 1128, width: 456, height: 96 },
  { x: 672, y: 1128, width: 552, height: 96 },
  { x: 372, y: 372, width: 480, height: 480 },
]

export const FIVE_GYM_INTERIOR_WORLD_WIDTH = Math.floor(
  FIVE_GYM_INTERIOR_MAP_SIZE.width * FIVE_GYM_INTERIOR_MAP_DRAW_SCALE,
)
export const FIVE_GYM_INTERIOR_WORLD_HEIGHT = Math.floor(
  FIVE_GYM_INTERIOR_MAP_SIZE.height * FIVE_GYM_INTERIOR_MAP_DRAW_SCALE,
)
