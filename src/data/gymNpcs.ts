import { publicAsset } from '../utils/publicAsset'
import type { NpcData } from './npcs'

export const GYM_TRAINER_NPC_ID = 'gym-trainer'
export const GYM_TIER_1_NPC_ID = 'gym-tier-1'

const TRAINER_SPRITE = publicAsset('Assets/Characters/npcs/Walker-idle.png')

/** Oceanview Gym trainer — tier 1 gatekeeper (walker sprite by the ring). */
export const GYM_TRAINER_NPC: NpcData = {
  id: GYM_TRAINER_NPC_ID,
  name: 'trainer',
  x: 506,
  y: 319,
  lines: ["you want the work? welcome to day one. show me something."],
  linesConverted: ["tier one's yours. tier two? soon."],
  color: '#afa9ec',
  spriteSrc: TRAINER_SPRITE,
  spriteLayout: 'horizontal-bbox',
  fixedFacing: 'left',
}

export const FIVE_GYM_INTERIOR_NPCS: readonly NpcData[] = [GYM_TRAINER_NPC]
