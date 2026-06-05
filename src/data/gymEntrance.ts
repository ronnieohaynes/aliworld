import type { TriggerZone } from './triggerZones'

/** Oceanview Gym left door on native 1254×1254 `5ive-map.PNG`. */
export const OCEANVIEW_GYM_DOOR_X = 751

/**
 * North storefront band bottom at the door (collisionZones north band y=265 h=62).
 * Measured standstill walking straight UP at x≈751: worldY=301, feetY=337.
 */
export const OCEANVIEW_GYM_COLLISION_BOTTOM_Y = 327

/** 48×48 entrance on sidewalk — top edge at collision bottom, extends south. */
export const OCEANVIEW_GYM_ENTRANCE_ZONE: TriggerZone = {
  id: 'oceanview-gym-entrance',
  x: OCEANVIEW_GYM_DOOR_X - 24,
  y: OCEANVIEW_GYM_COLLISION_BOTTOM_Y,
  width: 48,
  height: 48,
  action: 'OPEN_OCEANVIEW_GYM',
}

/** Sidewalk spawn when exiting — 12px south of zone bottom (375), facing down. */
export const FIVE_GYM_EXTERIOR_RETURN = {
  x: OCEANVIEW_GYM_DOOR_X,
  y: OCEANVIEW_GYM_COLLISION_BOTTOM_Y + 48 + 12,
}
