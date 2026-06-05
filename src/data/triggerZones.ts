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

/** Door/exit triggers that swap maps — must clear once before they can fire (spawn-safe). */
const ARM_AFTER_CLEAR_ACTIONS = new Set<TriggerAction>([
  'OPEN_BLUE_STORE',
  'OPEN_BLUE_STORE_EXIT',
  'OPEN_OCEANVIEW_GYM',
  'OPEN_OCEANVIEW_GYM_EXIT',
])

export function isArmAfterClearTrigger(action: TriggerAction): boolean {
  return ARM_AFTER_CLEAR_ACTIONS.has(action)
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
    x: 580,
    y: 850,
    width: 70,
    height: 20,
    action: 'OPEN_DARKLINE',
  },
]

/** Spawn point when returning from Darkline — south sidewalk in front of the entrance. */
export const DARKLINE_SPAWN_X = 512
export const DARKLINE_SPAWN_Y = 620
