export type TriggerAction =
  | 'OPEN_13GALLONS'
  | 'OPEN_DARKLINE'
  | 'OPEN_ONE_LOVE_CAFE'
  | 'START_BATTLE_MARK'

export type TriggerZone = {
  id: string
  x: number
  y: number
  width: number
  height: number
  action: TriggerAction
}

export const TRIGGER_ZONES: TriggerZone[] = [
  {
    id: 'gallons-entrance',
    x: 490,
    y: 270,
    width: 160,
    height: 60,
    action: 'OPEN_13GALLONS',
  },
  {
    id: 'darkline-entrance',
    x: 580,
    y: 850,
    width: 70,
    height: 20,
    action: 'OPEN_DARKLINE',
  },
  {
    id: 'mark-battle',
    x: 300,
    y: 560,
    width: 100,
    height: 100,
    action: 'START_BATTLE_MARK',
  },
]

/** Spawn point when returning from Darkline — south sidewalk in front of the entrance. */
export const DARKLINE_SPAWN_X = 512
export const DARKLINE_SPAWN_Y = 620
