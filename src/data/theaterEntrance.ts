import type { TriggerZone } from './triggerZones'

/** Sunset Bakery facade door on native 1254×1254 `5ive-map.PNG` (theater entrance). */
export const THEATER_DOOR_LEFT = 968
export const THEATER_DOOR_RIGHT = 1028
export const THEATER_DOOR_LINTEL_BOTTOM_Y = 312

/** Walk into the lower door threshold to enter the theater lobby. */
export const THEATER_ENTRANCE_ZONE: TriggerZone = {
  id: 'theater-entrance',
  x: THEATER_DOOR_LEFT,
  y: THEATER_DOOR_LINTEL_BOTTOM_Y,
  width: THEATER_DOOR_RIGHT - THEATER_DOOR_LEFT,
  height: 48,
  action: 'OPEN_THEATER',
}

export const THEATER_EXTERIOR_RETURN = {
  x: THEATER_ENTRANCE_ZONE.x + Math.floor(THEATER_ENTRANCE_ZONE.width / 2),
  y: THEATER_ENTRANCE_ZONE.y + THEATER_ENTRANCE_ZONE.height + 12,
}
