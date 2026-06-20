// Shared helper for resolving player spawn points around door/transition zones.
// Yellow-painted zones on the maps mark these door transition triggers.
//
// Convention: when walking IN through a door, spawn 15px ABOVE the door's
// entry position (toward the room interior). When walking OUT, spawn 15px
// BELOW the door's entry position (toward the exterior). If that spot is
// not walkable (overlaps a collision zone), fall back to 15px left, then
// 15px right of the door's entry position.

import type { CollisionZone } from './collisionZones'

/** Standalone copy of Player.tsx's feet-hitbox constants, kept in sync manually. */
const PLAYER_DISPLAY_HEIGHT = 72
const FEET_HITBOX_WIDTH = 30
const FEET_HITBOX_HEIGHT = 20

/** Distance (px) used for the up/down/left/right spawn offsets. */
export const DOOR_SPAWN_OFFSET = 15

export type DoorZone = {
  x: number
  y: number
  width: number
  height: number
}

function rectsOverlap(a: CollisionZone, b: CollisionZone): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

function getFeetHitbox(worldX: number, worldY: number): CollisionZone {
  const feetY = worldY + PLAYER_DISPLAY_HEIGHT / 2
  return {
    x: worldX - FEET_HITBOX_WIDTH / 2,
    y: feetY - FEET_HITBOX_HEIGHT / 2,
    width: FEET_HITBOX_WIDTH,
    height: FEET_HITBOX_HEIGHT,
  }
}

function collidesAt(worldX: number, worldY: number, collisionZones: CollisionZone[]): boolean {
  const feet = getFeetHitbox(worldX, worldY)
  return collisionZones.some((zone) => rectsOverlap(feet, zone))
}

/**
 * Resolve a spawn point near a door's entry position.
 *
 * @param door - the door/transition zone (yellow trigger zone)
 * @param verticalOffset - +DOOR_SPAWN_OFFSET to spawn below the door (exiting),
 *   -DOOR_SPAWN_OFFSET to spawn above the door (entering)
 * @param collisionZones - collision zones of the DESTINATION map
 */
export function resolveDoorSpawn(
  door: DoorZone,
  verticalOffset: number,
  collisionZones: CollisionZone[],
): { x: number; y: number } {
  const entry = {
    x: door.x + door.width / 2,
    y: door.y + door.height / 2,
  }

  const vertical = { x: entry.x, y: entry.y + verticalOffset }
  if (!collidesAt(vertical.x, vertical.y, collisionZones)) return vertical

  const left = { x: entry.x - DOOR_SPAWN_OFFSET, y: entry.y }
  if (!collidesAt(left.x, left.y, collisionZones)) return left

  const right = { x: entry.x + DOOR_SPAWN_OFFSET, y: entry.y }
  return right
}
