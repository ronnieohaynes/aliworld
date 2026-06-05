// Oceanview Gym interior — native 1224×1224 `5ive-gym.png` (1:1 world coords).

export interface CollisionZone {
  x: number
  y: number
  width: number
  height: number
}

export const FIVE_GYM_INTERIOR_MAP_SIZE = { width: 1224, height: 1224 }

export const FIVE_GYM_INTERIOR_WORLD_WIDTH = FIVE_GYM_INTERIOR_MAP_SIZE.width
export const FIVE_GYM_INTERIOR_WORLD_HEIGHT = FIVE_GYM_INTERIOR_MAP_SIZE.height

/** Just inside the south door. */
export const FIVE_GYM_INTERIOR_ENTRY = { x: 612, y: 1080 }

/** Exit trigger at the south doorway. */
export const FIVE_GYM_EXIT_ZONE = { x: 552, y: 1148, width: 120, height: 76 }

/** Outer shell + center boxing ring (native map pixels). */
export const FIVE_GYM_INTERIOR_COLLISION_ZONES: CollisionZone[] = [
  { x: 0, y: 0, width: 1224, height: 96 },
  { x: 0, y: 96, width: 96, height: 1128 },
  { x: 1128, y: 96, width: 96, height: 1128 },
  { x: 96, y: 1128, width: 456, height: 96 },
  { x: 672, y: 1128, width: 552, height: 96 },
  { x: 372, y: 372, width: 480, height: 480 },
]
