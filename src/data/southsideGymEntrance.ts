import type { TriggerZone } from './triggerZones'

/** Southside gym door — west sidewalk (native 1254×1254 southside map). */
export const SOUTHSIDE_GYM_DOOR_X = 248

export const SOUTHSIDE_GYM_ENTRANCE_ZONE: TriggerZone = {
  id: 'southside-gym-entrance',
  x: 224,
  y: 868,
  width: 48,
  height: 48,
  action: 'OPEN_SOUTHSIDE_GYM',
}

/** Sidewalk spawn when exiting the southside gym interior. */
export const SOUTHSIDE_GYM_EXTERIOR_RETURN = {
  x: SOUTHSIDE_GYM_DOOR_X,
  y: SOUTHSIDE_GYM_ENTRANCE_ZONE.y + SOUTHSIDE_GYM_ENTRANCE_ZONE.height + 12,
}
