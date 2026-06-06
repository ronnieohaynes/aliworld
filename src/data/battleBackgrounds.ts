import { publicAsset } from '../utils/publicAsset'

/** Location key for battle backdrop art (`public/Assets/battle-bg/`). */
export type BattleLocationId = 'five' | 'san_bruno' | 'hillside' | 'five_gym'

const BATTLE_BG_DIR = publicAsset('Assets/battle-bg')

export const BATTLE_BACKGROUND_SRC: Record<BattleLocationId, string> = {
  five: `${BATTLE_BG_DIR}/5ive.png`,
  san_bruno: `${BATTLE_BG_DIR}/san-bruno.png`,
  hillside: `${BATTLE_BG_DIR}/hillside.png`,
  five_gym: `${BATTLE_BG_DIR}/5ive-gym.png`,
}

export const DEFAULT_BATTLE_LOCATION: BattleLocationId = 'five'

export function getBattleBackgroundSrc(location: BattleLocationId): string {
  return BATTLE_BACKGROUND_SRC[location]
}

/** Per-NPC override when set; otherwise the city's battle backdrop. */
export function resolveBattleBackgroundSrc(entry: {
  battleBg?: string
  battleLocation: BattleLocationId
}): string {
  if (entry.battleBg) return entry.battleBg
  return getBattleBackgroundSrc(entry.battleLocation)
}

/**
 * Return the battle background src for a given location, used for the
 * split-stage hometown system (top = enemy bg, bottom = player bg).
 */
export function getBattleBgForLocation(locationId: BattleLocationId): string {
  return BATTLE_BACKGROUND_SRC[locationId] ?? BATTLE_BACKGROUND_SRC[DEFAULT_BATTLE_LOCATION]
}
