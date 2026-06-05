import type { TriggerZone } from './triggerZones'

/** Oceanview Gym left door threshold (native 1254×1254 `5ive-map.PNG`). */
export const OCEANVIEW_GYM_DOOR = { x: 751, y: 295 }

/** Sidewalk trigger center — 48×48, y300–348, in front of the door. */
export const OCEANVIEW_GYM_ENTRANCE_CENTER = { x: 751, y: 324 }

export const OCEANVIEW_GYM_ENTRANCE_ZONE: TriggerZone = {
  id: 'oceanview-gym-entrance',
  x: OCEANVIEW_GYM_ENTRANCE_CENTER.x - 24,
  y: OCEANVIEW_GYM_ENTRANCE_CENTER.y - 24,
  width: 48,
  height: 48,
  action: 'OPEN_OCEANVIEW_GYM',
}

/** Sidewalk spawn when exiting — just south of the entrance zone, facing down. */
export const FIVE_GYM_EXTERIOR_RETURN = {
  x: 751,
  y: 356,
}
