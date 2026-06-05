// Oceanview Gym interior — native 1224×1224 `5ive-gym.png`; gameplay at mapDrawScale 0.5.

export interface CollisionZone {
  x: number
  y: number
  width: number
  height: number
}

export const FIVE_GYM_INTERIOR_MAP_SIZE = { width: 1224, height: 1224 }

/** Bitmap draw scale — environment authored at 1224; shrink to match Midnight. */
export const FIVE_GYM_INTERIOR_MAP_DRAW_SCALE = 0.5

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

export const FIVE_GYM_INTERIOR_WORLD_WIDTH = Math.floor(
  FIVE_GYM_INTERIOR_MAP_SIZE.width * FIVE_GYM_INTERIOR_MAP_DRAW_SCALE,
)
export const FIVE_GYM_INTERIOR_WORLD_HEIGHT = Math.floor(
  FIVE_GYM_INTERIOR_MAP_SIZE.height * FIVE_GYM_INTERIOR_MAP_DRAW_SCALE,
)

/** Just inside the south door (scaled world coords). */
export const FIVE_GYM_INTERIOR_ENTRY = scaleFiveGymInteriorPoint({ x: 612, y: 1080 })

/** Exit trigger at the south doorway (scaled world coords). */
export const FIVE_GYM_EXIT_ZONE = {
  x: scaleInteriorCoord(552),
  y: scaleInteriorCoord(1148),
  width: scaleInteriorSize(120),
  height: scaleInteriorSize(76),
}

/** Outer shell + center boxing ring (native map pixels — scale via `scaleFiveGymInteriorZone`). */
export const FIVE_GYM_INTERIOR_COLLISION_ZONES: CollisionZone[] = [
  { x: 0, y: 0, width: 1224, height: 96 },
  { x: 0, y: 96, width: 96, height: 1128 },
  { x: 1128, y: 96, width: 96, height: 1128 },
  { x: 96, y: 1128, width: 456, height: 96 },
  { x: 672, y: 1128, width: 552, height: 96 },
  { x: 372, y: 372, width: 480, height: 480 },
]
