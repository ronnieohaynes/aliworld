import type { CollisionZone } from './collisionZones'

/** Placeholder interior, dark room until theater art lands. Uses gym bitmap scaled down. */
export const THEATER_INTERIOR_MAP_SIZE = { width: 1224, height: 1224 }
export const THEATER_INTERIOR_MAP_DRAW_SCALE = 0.5

function scale(value: number): number {
  return Math.floor(value * THEATER_INTERIOR_MAP_DRAW_SCALE)
}

function scaleSize(value: number): number {
  return Math.max(1, Math.floor(value * THEATER_INTERIOR_MAP_DRAW_SCALE))
}

export function scaleTheaterInteriorZone(zone: CollisionZone): CollisionZone {
  return {
    x: scale(zone.x),
    y: scale(zone.y),
    width: scaleSize(zone.width),
    height: scaleSize(zone.height),
  }
}

export function scaleTheaterInteriorPoint(point: { x: number; y: number }): {
  x: number
  y: number
} {
  return { x: scale(point.x), y: scale(point.y) }
}

export const THEATER_INTERIOR_WORLD_WIDTH = scale(THEATER_INTERIOR_MAP_SIZE.width)
export const THEATER_INTERIOR_WORLD_HEIGHT = scale(THEATER_INTERIOR_MAP_SIZE.height)

export const THEATER_INTERIOR_ENTRY = scaleTheaterInteriorPoint({ x: 612, y: 1034 })

export const THEATER_EXIT_ZONE = {
  x: scale(552),
  y: scale(1128),
  width: scaleSize(120),
  height: scaleSize(96),
}

/** Minimal shell, open floor (placeholder until theater interior art). */
export const THEATER_INTERIOR_COLLISION_ZONES: CollisionZone[] = [
  { x: 0, y: 0, width: 1224, height: 252 },
  { x: 0, y: 252, width: 96, height: 876 },
  { x: 1133, y: 252, width: 91, height: 876 },
  { x: 96, y: 1128, width: 461, height: 96 },
  { x: 667, y: 1128, width: 557, height: 96 },
].map(scaleTheaterInteriorZone)
