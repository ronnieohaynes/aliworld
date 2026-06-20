import { CLERK_NPC, RESTOCKER_NPC, type NpcData } from './npcs'

/**
 * Blue store interior NPCs, native 1254×1254 map pixels.
 * Scaled to gameplay coords in cityConfig (mapDrawScale 0.55), same as gym interiors.
 *
 * Entry spawn (scaled): x≈60, y≈506, left threshold. Clerk sits a few tiles east on
 * the walk line; restocker is deeper east toward the back shelves.
 */
export const CLERK_INTERIOR_NPC: NpcData = {
  ...CLERK_NPC,
  x: 510,
  y: 291,
  fixedFacing: 'down',
  blocksMovement: true,
  // Shrink the default 45x75 NPC collision box, it was blocking too much of the desk area.
  collisionWidth: 36,
  collisionHeight: 30,
  collisionOffsetY: 10,
}

/** Back of store, past the clerk, toward shelf / stock room. */
export const RESTOCKER_INTERIOR_NPC: NpcData = {
  ...RESTOCKER_NPC,
  x: 873,
  y: 764,
  fixedFacing: 'left',
  blocksMovement: true,
}

export const BLUE_STORE_INTERIOR_NPCS: readonly NpcData[] = [
  CLERK_INTERIOR_NPC,
  RESTOCKER_INTERIOR_NPC,
]
