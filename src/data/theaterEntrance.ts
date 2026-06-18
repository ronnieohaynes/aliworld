import type { TriggerZone } from './triggerZones'

/** Sunset Bakery door site in the 5ive, upper-right near jaclyn. */
export const THEATER_ENTRANCE_ZONE: TriggerZone = {
  id: 'theater-entrance',
  x: 998,
  y: 268,
  width: 56,
  height: 56,
  action: 'OPEN_THEATER',
}

export const THEATER_EXTERIOR_RETURN = {
  x: THEATER_ENTRANCE_ZONE.x + Math.floor(THEATER_ENTRANCE_ZONE.width / 2),
  y: THEATER_ENTRANCE_ZONE.y + THEATER_ENTRANCE_ZONE.height + 12,
}
