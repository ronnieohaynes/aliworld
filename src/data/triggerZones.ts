export type TriggerAction = 'OPEN_13GALLONS'

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
]
