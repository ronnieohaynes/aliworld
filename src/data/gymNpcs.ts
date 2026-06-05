import { publicAsset } from '../utils/publicAsset'
import { FIVE_GYM1_ID } from '../store/gymStore'
import type { NpcData } from './npcs'

export { FIVE_GYM1_ID }

const FIVE_GYM1_SPRITE = publicAsset('Assets/Characters/npcs/5ive-gym1.png')

/** Week 1 head — Oceanview Gym (`5ive-gym1`). */
export const FIVE_GYM1_HEAD_NPC: NpcData = {
  id: FIVE_GYM1_ID,
  name: 'trainer',
  x: 506,
  y: 319,
  lines: ['week one. i run this floor. you want the work?'],
  linesConverted: ["week one's yours. don't get comfortable."],
  color: '#afa9ec',
  spriteSrc: FIVE_GYM1_SPRITE,
  spriteColumns: 4,
  fixedFacing: 'left',
}

export function isGymHeadCombatId(npcId: string): boolean {
  return npcId === FIVE_GYM1_ID
}

export const FIVE_GYM1_INTERIOR_NPCS: readonly NpcData[] = [FIVE_GYM1_HEAD_NPC]
