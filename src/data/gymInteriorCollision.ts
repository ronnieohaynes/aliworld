// Oceanview Gym interior, native 1224×1224 `5ive-gym.png`; gameplay at mapDrawScale 0.5.

export interface CollisionZone {
  x: number
  y: number
  width: number
  height: number
}

export const FIVE_GYM_INTERIOR_MAP_SIZE = { width: 1224, height: 1224 }

/** Bitmap draw scale, environment authored at 1224; shrink to match Midnight. */
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

/** Just inside the south door, same threshold as exit (native y=1034 → scaled 517). */
export const FIVE_GYM_INTERIOR_ENTRY = scaleFiveGymInteriorPoint({ x: 612, y: 1034 })

/** South doorway exit, the door you enter through (native wall gap at y=1128). */
export const FIVE_GYM_EXIT_ZONE = {
  x: scaleInteriorCoord(552),
  y: scaleInteriorCoord(1128),
  width: scaleInteriorSize(120),
  height: scaleInteriorSize(96),
}

/** Outer shell + center boxing ring (native map pixels, scale via `scaleFiveGymInteriorZone`). */
export const FIVE_GYM_INTERIOR_COLLISION_ZONES: CollisionZone[] = [
  { x: 0,    y: 0,    width: 1224, height: 252  }, // top wall
  { x: 0,    y: 252,  width: 96,   height: 876  }, // left wall
  // punching bag stands, magenta base of each left-wall unit (small footprint)
  { x: 82,   y: 480,  width: 56,   height: 30   }, // bag stand 1
  { x: 82,   y: 669,  width: 56,   height: 24   }, // bag stand 2
  { x: 82,   y: 855,  width: 52,   height: 34   }, // bag stand 3
  // upper-right interior block (counter / room corner)
  { x: 960,  y: 252,  width: 173,  height: 130  },
  { x: 1133, y: 252,  width: 91,   height: 876  }, // right wall
  { x: 96,   y: 1128, width: 461,  height: 96   }, // bottom wall left of door
  { x: 667,  y: 1128, width: 557,  height: 96   }, // bottom wall right of door
  { x: 400,  y: 435,  width: 440,  height: 390  }, // boxing ring
]
