import type { TriggerZone } from './triggerZones'

/** Oceanview Gym left door on native 1254×1254 `5ive-map.PNG`. */
export const OCEANVIEW_GYM_DOOR = { x: 751, y: 308 }

export const OCEANVIEW_GYM_ENTRANCE_ZONE: TriggerZone = {
  id: 'oceanview-gym-entrance',
  x: OCEANVIEW_GYM_DOOR.x - 24,
  y: OCEANVIEW_GYM_DOOR.y - 24,
  width: 48,
  height: 48,
  action: 'OPEN_OCEANVIEW_GYM',
}

/** Sidewalk spawn when exiting — south of the door, facing down. */
export const FIVE_GYM_EXTERIOR_RETURN = {
  x: OCEANVIEW_GYM_DOOR.x,
  y: 344,
}
