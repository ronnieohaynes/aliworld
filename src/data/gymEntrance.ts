import type { TriggerZone } from './triggerZones'

/** Oceanview Gym door on `5ive-map.PNG` (author coords). */
export const OCEANVIEW_GYM_DOOR = { x: 256, y: 256 }

export const OCEANVIEW_GYM_ENTRANCE_ZONE: TriggerZone = {
  id: 'oceanview-gym-entrance',
  x: OCEANVIEW_GYM_DOOR.x - 24,
  y: OCEANVIEW_GYM_DOOR.y - 24,
  width: 48,
  height: 48,
  action: 'OPEN_OCEANVIEW_GYM',
}

/** Sidewalk spawn when exiting the gym — south of the door, facing down. */
export const FIVE_GYM_EXTERIOR_RETURN = {
  x: OCEANVIEW_GYM_DOOR.x,
  y: 288,
}
