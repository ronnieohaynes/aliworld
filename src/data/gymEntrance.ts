import type { TriggerZone } from './triggerZones'

/** Oceanview Gym left door on native 1254×1254 `5ive-map.PNG`. */
export const OCEANVIEW_GYM_DOOR_X = 751

/** 48×48 entrance at the left door threshold. */
export const OCEANVIEW_GYM_ENTRANCE_ZONE: TriggerZone = {
  id: 'oceanview-gym-entrance',
  x: 727,
  y: 280,
  width: 48,
  height: 48,
  action: 'OPEN_OCEANVIEW_GYM',
}

/** Sidewalk spawn when exiting — 12px south of zone bottom, facing down. */
export const FIVE_GYM_EXTERIOR_RETURN = {
  x: OCEANVIEW_GYM_DOOR_X,
  y: OCEANVIEW_GYM_ENTRANCE_ZONE.y + OCEANVIEW_GYM_ENTRANCE_ZONE.height + 12,
}
