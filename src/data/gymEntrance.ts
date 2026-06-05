import type { TriggerZone } from './triggerZones'

/** Oceanview Gym door on the 5ive storefront row (4th building from the left). */
export const OCEANVIEW_GYM_ENTRANCE_ZONE: TriggerZone = {
  id: 'oceanview-gym-entrance',
  x: 592,
  y: 300,
  width: 56,
  height: 48,
  action: 'OPEN_OCEANVIEW_GYM',
}

/** Sidewalk spawn when exiting the gym back to the 5ive. */
export const FIVE_GYM_EXTERIOR_RETURN = {
  x: 620,
  y: 368,
}
