// Southside gym interior — native 1224×1224 `southside-gym.png`; gameplay at mapDrawScale 0.5.
// Collision shell mirrors oceanview gym until art-specific zones land.

export interface CollisionZone {
  x: number
  y: number
  width: number
  height: number
}

export const SOUTHSIDE_GYM_INTERIOR_MAP_SIZE = { width: 1224, height: 1224 }

export const SOUTHSIDE_GYM_INTERIOR_MAP_DRAW_SCALE = 0.5

function scaleInteriorCoord(value: number): number {
  return Math.floor(value * SOUTHSIDE_GYM_INTERIOR_MAP_DRAW_SCALE)
}

function scaleInteriorSize(value: number): number {
  return Math.max(1, Math.floor(value * SOUTHSIDE_GYM_INTERIOR_MAP_DRAW_SCALE))
}

export function scaleSouthsideGymInteriorZone(zone: CollisionZone): CollisionZone {
  return {
    x: scaleInteriorCoord(zone.x),
    y: scaleInteriorCoord(zone.y),
    width: scaleInteriorSize(zone.width),
    height: scaleInteriorSize(zone.height),
  }
}

export function scaleSouthsideGymInteriorPoint(point: { x: number; y: number }): {
  x: number
  y: number
} {
  return { x: scaleInteriorCoord(point.x), y: scaleInteriorCoord(point.y) }
}

export const SOUTHSIDE_GYM_INTERIOR_WORLD_WIDTH = Math.floor(
  SOUTHSIDE_GYM_INTERIOR_MAP_SIZE.width * SOUTHSIDE_GYM_INTERIOR_MAP_DRAW_SCALE,
)
export const SOUTHSIDE_GYM_INTERIOR_WORLD_HEIGHT = Math.floor(
  SOUTHSIDE_GYM_INTERIOR_MAP_SIZE.height * SOUTHSIDE_GYM_INTERIOR_MAP_DRAW_SCALE,
)

export const SOUTHSIDE_GYM_INTERIOR_ENTRY = scaleSouthsideGymInteriorPoint({ x: 612, y: 1034 })

export const SOUTHSIDE_GYM_EXIT_ZONE = {
  x: scaleInteriorCoord(552),
  y: scaleInteriorCoord(1128),
  width: scaleInteriorSize(120),
  height: scaleInteriorSize(96),
}

export const SOUTHSIDE_GYM_INTERIOR_COLLISION_ZONES: CollisionZone[] = [
  { x: 0, y: 0, width: 1224, height: 252 },
  { x: 0, y: 252, width: 96, height: 876 },
  { x: 82, y: 480, width: 56, height: 30 },
  { x: 82, y: 669, width: 56, height: 24 },
  { x: 82, y: 855, width: 52, height: 34 },
  { x: 960, y: 252, width: 173, height: 130 },
  { x: 1133, y: 252, width: 91, height: 876 },
  { x: 96, y: 1128, width: 461, height: 96 },
  { x: 667, y: 1128, width: 557, height: 96 },
  { x: 400, y: 435, width: 440, height: 390 },
]
