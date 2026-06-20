import type { CollisionZone } from './collisionZones'

/** Lobby walkable map — `public/Assets/tileset/theater.png` (1224×1224 native). */
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

/** Just inside the south entrance door. */
export const THEATER_INTERIOR_ENTRY = scaleTheaterInteriorPoint({ x: 612, y: 1040 })

/** South doorway back to the 5ive. */
export const THEATER_EXIT_ZONE = {
  x: scale(552),
  y: scale(1128),
  width: scaleSize(120),
  height: scaleSize(96),
}

/** Ticket booth counter — walk up to enter the viewing section. Native map pixels. */
export const THEATER_TICKET_BOOTH_ZONE = {
  x: 228,
  y: 848,
  width: 132,
  height: 96,
}

/** Native-map collision: lobby floor only; auditorium + fixtures blocked. */
export const THEATER_INTERIOR_COLLISION_ZONES: CollisionZone[] = [
  // auditorium + screen (not walkable on tileset — viewing uses battle-bg)
  { x: 0, y: 0, width: 1224, height: 688 },
  // lobby side walls
  { x: 0, y: 688, width: 108, height: 536 },
  { x: 1116, y: 688, width: 108, height: 536 },
  // lobby stair risers
  { x: 96, y: 688, width: 148, height: 188 },
  { x: 980, y: 688, width: 148, height: 188 },
  // concession island + marquee base
  { x: 392, y: 812, width: 448, height: 168 },
  // snack / poster kiosks flanking counter
  { x: 268, y: 900, width: 88, height: 120 },
  { x: 868, y: 900, width: 88, height: 120 },
  // bottom wall with center door gap
  { x: 0, y: 1128, width: 552, height: 96 },
  { x: 672, y: 1128, width: 552, height: 96 },
].map(scaleTheaterInteriorZone)
