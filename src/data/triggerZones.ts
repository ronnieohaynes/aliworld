export type TriggerAction =
  | 'OPEN_13GALLONS'
  | 'OPEN_DARKLINE'
  | 'OPEN_ONE_LOVE_CAFE'
  | 'OPEN_BLUE_STORE'
  | 'OPEN_BLUE_STORE_EXIT'
  | 'OPEN_OCEANVIEW_GYM'
  | 'OPEN_OCEANVIEW_GYM_EXIT'

export type TriggerZone = {
  id: string
  x: number
  y: number
  width: number
  height: number
  action: TriggerAction
}

/** 13 Gallons door — disabled until interior is ready; add back to TRIGGER_ZONES to re-enable. */
export const GALLONS_ENTRANCE_ZONE: TriggerZone = {
  id: 'gallons-entrance',
  x: 490,
  y: 270,
  width: 160,
  height: 60,
  action: 'OPEN_13GALLONS',
}

export const TRIGGER_ZONES: TriggerZone[] = [
  {
    id: 'darkline-entrance',
    x: 550,
    y: 850,
    width: 100,
    height: 20,
    action: 'OPEN_DARKLINE',
  },
]

/** Spawn point when returning from Darkline — south sidewalk in front of the entrance. */
export const DARKLINE_SPAWN_X = 512
export const DARKLINE_SPAWN_Y = 620
