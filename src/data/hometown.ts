export type HometownId = 'the_5ive'

export type HometownDef = {
  id: HometownId
  displayName: string
  battleLocationId: string
}

const HOMETOWNS: Record<HometownId, HometownDef> = {
  the_5ive: {
    id: 'the_5ive',
    displayName: 'the 5ive',
    battleLocationId: 'daly_city',
  },
}

export function getHometownDef(id: HometownId): HometownDef {
  return HOMETOWNS[id] ?? HOMETOWNS.the_5ive
}

export function battleLocationToHometownId(_location: string): HometownId {
  return 'the_5ive'
}
