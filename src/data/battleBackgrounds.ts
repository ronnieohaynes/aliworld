import { publicAsset } from '../utils/publicAsset'

/** Location key for battle backdrop art (`public/Assets/battle-bg/`). */
export type BattleLocationId = 'daly_city' | 'san_bruno' | 'hillside'

const BATTLE_BG_DIR = publicAsset('Assets/battle-bg')

export const BATTLE_BACKGROUND_SRC: Record<BattleLocationId, string> = {
  daly_city: `${BATTLE_BG_DIR}/daly-city.png`,
  san_bruno: `${BATTLE_BG_DIR}/san-bruno.png`,
  hillside: `${BATTLE_BG_DIR}/hillside.png`,
}

export const DEFAULT_BATTLE_LOCATION: BattleLocationId = 'daly_city'

export function getBattleBackgroundSrc(location: BattleLocationId): string {
  return BATTLE_BACKGROUND_SRC[location]
}
