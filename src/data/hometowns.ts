/**
 * Hometown registry for ALIWORLD.
 *
 * Every city has an unlockable "Hometown" card. Players select their hometown
 * on the loadout screen. In battle, the stage is split: the top half shows the
 * enemy's hometown background, the bottom half shows the player's hometown.
 *
 * A hometown's `battleLocationId` maps to a key in BATTLE_BACKGROUND_SRC.
 */
import type { BattleLocationId } from './battleBackgrounds'

export type HometownId = 'five' | 'san_bruno' | 'hillside' | 'five_gym' | 'blue_store'

export type HometownDef = {
  id: HometownId
  /** Display name shown on the card. */
  name: string
  /** Which battle background art to use in the split stage. */
  battleLocationId: BattleLocationId
  /** Short city/neighborhood flavor text. */
  tagline: string
}

export const HOMETOWNS: Record<HometownId, HometownDef> = {
  five: {
    id: 'five',
    name: '5IVE',
    battleLocationId: 'five',
    tagline: 'Daly City streets',
  },
  san_bruno: {
    id: 'san_bruno',
    name: 'SAN BRUNO',
    battleLocationId: 'san_bruno',
    tagline: 'Peninsula corners',
  },
  hillside: {
    id: 'hillside',
    name: 'HILLSIDE',
    battleLocationId: 'hillside',
    tagline: 'The high side',
  },
  five_gym: {
    id: 'five_gym',
    name: 'OCEANVIEW GYM',
    battleLocationId: 'five_gym',
    tagline: '5ive\'s home gym',
  },
  blue_store: {
    id: 'blue_store',
    name: 'BLUE STORE',
    battleLocationId: 'blue_store',
    tagline: 'Southside stockroom',
  },
}

export const DEFAULT_HOMETOWN_ID: HometownId = 'five'

export const HOMETOWN_LIST: HometownDef[] = Object.values(HOMETOWNS)

/** Return the def for a given id, falling back to default if unknown. */
export function getHometownDef(id: string): HometownDef {
  return HOMETOWNS[id as HometownId] ?? HOMETOWNS[DEFAULT_HOMETOWN_ID]
}

/**
 * Map a BattleLocationId to the closest HometownId.
 * Used to infer enemy hometown from their battleLocation field.
 */
export function battleLocationToHometownId(locationId: BattleLocationId): HometownId {
  const map: Record<BattleLocationId, HometownId> = {
    five: 'five',
    san_bruno: 'san_bruno',
    hillside: 'hillside',
    five_gym: 'five_gym',
    blue_store: 'blue_store',
  }
  return map[locationId] ?? DEFAULT_HOMETOWN_ID
}
